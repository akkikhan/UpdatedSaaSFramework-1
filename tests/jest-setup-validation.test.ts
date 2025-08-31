// Simple test to validate Jest setup
describe("Jest Setup Validation", () => {
  it("should be able to run basic tests", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle async operations", async () => {
    const result = await Promise.resolve("test");
    expect(result).toBe("test");
  });

  it("should work with TypeScript", () => {
    const testObject: { name: string; value: number } = {
      name: "test",
      value: 42,
    };

    expect(testObject.name).toBe("test");
    expect(testObject.value).toBe(42);
  });

  it("should handle mock functions", () => {
    const mockFunction = jest.fn();
    mockFunction("test");

    expect(mockFunction).toHaveBeenCalledWith("test");
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });
});
