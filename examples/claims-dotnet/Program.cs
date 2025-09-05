using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
// CORS: allow Angular origin for cross-origin Authorization requests
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors();

var BASE = Environment.GetEnvironmentVariable("SAAS_BASE_URL") ?? "http://localhost:5000";
var LOG_KEY = Environment.GetEnvironmentVariable("LOGGING_API_KEY") ?? "";

// Sample in-memory claims
var claims = new List<Dictionary<string, object>>
{
    new() { ["id"] = "CLM-1001", ["policyId"] = "POL-9001", ["amount"] = 1500.00, ["status"] = "submitted", ["notes"] = "Initial submission" },
    new() { ["id"] = "CLM-1002", ["policyId"] = "POL-9002", ["amount"] = 3200.00, ["status"] = "review", ["notes"] = "Need adjuster review" },
};

HttpClient NewClient(string? jwt = null)
{
    var http = new HttpClient();
    if (!string.IsNullOrWhiteSpace(jwt)) http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
    return http;
}

app.MapGet("/claims", async (HttpRequest req) =>
{
    var auth = req.Headers.Authorization.ToString();
    if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ")) return Results.Unauthorized();
    var jwt = auth.Substring("Bearer ".Length);

    // Verify token via platform
    using var http = NewClient(jwt);
    var verify = await http.GetAsync($"{BASE}/api/v2/auth/verify");
    if (!verify.IsSuccessStatusCode) return Results.Unauthorized();

    return Results.Ok(claims);
});

app.MapPost("/claims/{id}/approve", async (HttpRequest req, string id) =>
{
    var auth = req.Headers.Authorization.ToString();
    if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ")) return Results.Unauthorized();
    var jwt = auth.Substring("Bearer ".Length);

    using var http = NewClient(jwt);
    // 1) Verify JWT and get user
    var verifyRes = await http.GetAsync($"{BASE}/api/v2/auth/verify");
    if (!verifyRes.IsSuccessStatusCode) return Results.Unauthorized();
    using var doc = JsonDocument.Parse(await verifyRes.Content.ReadAsStringAsync());
    var userId = doc.RootElement.GetProperty("user").GetProperty("userId").GetString();
    if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

    // 2) Check permission claims.approve
    var payload = JsonSerializer.Serialize(new { userId, resource = "claims", action = "approve", explain = true });
    var checkRes = await http.PostAsync($"{BASE}/api/v2/rbac/check-permission", new StringContent(payload, Encoding.UTF8, "application/json"));
    if (!checkRes.IsSuccessStatusCode)
    {
        return Results.StatusCode(500);
    }
    var checkDoc = JsonDocument.Parse(await checkRes.Content.ReadAsStringAsync());
    var hasPermission = checkDoc.RootElement.GetProperty("hasPermission").GetBoolean();
    if (!hasPermission) return Results.Forbid();

    // 3) Update local claim state
    var claim = claims.FirstOrDefault(c => (string)c["id"] == id);
    if (claim is null) return Results.NotFound();
    claim["status"] = "approved";
    claim["notes"] = $"Approved at {DateTime.UtcNow:o}";

    // 4) Log event via X-API-Key
    if (!string.IsNullOrWhiteSpace(LOG_KEY))
    {
        using var http2 = new HttpClient();
        http2.DefaultRequestHeaders.Add("X-API-Key", LOG_KEY);
        var logPayload = JsonSerializer.Serialize(new { level = "info", message = $"Claim {id} approved", category = "claims", metadata = new { id } });
        _ = await http2.PostAsync($"{BASE}/api/v2/logging/events", new StringContent(logPayload, Encoding.UTF8, "application/json"));
    }

    return Results.Ok(claim);
});

app.Run("http://localhost:5299");
