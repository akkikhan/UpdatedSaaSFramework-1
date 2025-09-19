import { describe, expect, it } from "@jest/globals";
import { tenantRolePermissionSchema, permissionConditionSchema } from "../../shared/schema";

describe("RBAC schema validation", () => {
  it("requires resource and action", () => {
    expect(() => tenantRolePermissionSchema.parse({ resource: "", action: "" })).toThrow(
      /resource is required/
    );
  });

  it("accepts optional scope and conditions", () => {
    const permission = tenantRolePermissionSchema.parse({
      resource: "claims",
      action: "approve",
      scope: "tenant",
      conditions: [
        {
          type: "time-window",
          operator: "between",
          value: { start: "08:00", end: "18:00" },
        },
      ],
      description: "Allow approvals during business hours",
    });

    expect(permission.resource).toBe("claims");
    expect(permission.conditions).toHaveLength(1);
  });

  it("validates permission conditions", () => {
    expect(() =>
      permissionConditionSchema.parse({
        type: "",
        operator: "eq",
        value: "admin",
      })
    ).toThrow(/Condition type is required/);
  });
});
