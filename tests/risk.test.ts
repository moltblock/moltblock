import { describe, it, expect } from "vitest";
import { classifyRisk } from "../src/risk.js";

describe("classifyRisk", () => {
  describe("high risk", () => {
    it("classifies rm -rf as high", () => {
      const result = classifyRisk("rm -rf /home/user");
      expect(result.level).toBe("high");
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some((r) => r.includes("rm -rf"))).toBe(true);
    });

    it("classifies sudo as high", () => {
      const result = classifyRisk("sudo apt-get install something");
      expect(result.level).toBe("high");
      expect(result.reasons.some((r) => r.includes("Sudo"))).toBe(true);
    });

    it("classifies DROP TABLE as high", () => {
      const result = classifyRisk("DROP TABLE users");
      expect(result.level).toBe("high");
      expect(result.reasons.some((r) => r.includes("DROP"))).toBe(true);
    });

    it("classifies private key access as high", () => {
      const result = classifyRisk("read the id_rsa file");
      expect(result.level).toBe("high");
      expect(result.reasons.some((r) => r.includes("Private key"))).toBe(true);
    });

    it("classifies /etc/shadow as high", () => {
      const result = classifyRisk("cat /etc/shadow");
      expect(result.level).toBe("high");
      expect(result.reasons.some((r) => r.includes("Shadow"))).toBe(true);
    });

    it("classifies chmod 777 as high", () => {
      const result = classifyRisk("chmod 777 /var/www");
      expect(result.level).toBe("high");
    });

    it("classifies dd if= as high", () => {
      const result = classifyRisk("dd if=/dev/zero of=/dev/sda");
      expect(result.level).toBe("high");
    });

    it("classifies .ssh/ access as high", () => {
      const result = classifyRisk("copy files from ~/.ssh/");
      expect(result.level).toBe("high");
    });

    it("classifies kill -9 as high", () => {
      const result = classifyRisk("kill -9 1234");
      expect(result.level).toBe("high");
    });

    it("classifies credentials.json as high", () => {
      const result = classifyRisk("open credentials.json");
      expect(result.level).toBe("high");
    });
  });

  describe("medium risk", () => {
    it("classifies curl as medium", () => {
      const result = classifyRisk("curl the API endpoint");
      expect(result.level).toBe("medium");
      expect(result.reasons.some((r) => r.includes("curl"))).toBe(true);
    });

    it("classifies wget as medium", () => {
      const result = classifyRisk("wget the file");
      expect(result.level).toBe("medium");
    });

    it("classifies HTTP URLs as medium", () => {
      const result = classifyRisk("fetch data from https://api.example.com");
      expect(result.level).toBe("medium");
    });

    it("classifies fs.writeFile as medium", () => {
      const result = classifyRisk("use fs.writeFile to save data");
      expect(result.level).toBe("medium");
    });

    it("classifies child_process as medium", () => {
      const result = classifyRisk("import child_process to run commands");
      expect(result.level).toBe("medium");
    });

    it("classifies INSERT INTO as medium", () => {
      const result = classifyRisk("INSERT INTO users VALUES (1, 'test')");
      expect(result.level).toBe("medium");
    });
  });

  describe("low risk", () => {
    it("classifies simple text task as low", () => {
      const result = classifyRisk("write a function that adds two numbers");
      expect(result.level).toBe("low");
      expect(result.reasons).toHaveLength(0);
    });

    it("classifies empty task as low", () => {
      const result = classifyRisk("");
      expect(result.level).toBe("low");
      expect(result.reasons).toHaveLength(0);
    });

    it("classifies safe coding task as low", () => {
      const result = classifyRisk("implement a binary search algorithm in TypeScript");
      expect(result.level).toBe("low");
    });
  });

  describe("edge cases", () => {
    it("high overrides medium when both present", () => {
      const result = classifyRisk("sudo curl http://example.com");
      expect(result.level).toBe("high");
      expect(result.reasons.length).toBeGreaterThan(1);
    });

    it("populates reasons for all matches", () => {
      const result = classifyRisk("rm -rf / && chmod 777 /var");
      expect(result.level).toBe("high");
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });
  });
});
