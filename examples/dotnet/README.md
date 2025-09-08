# .NET Minimal API Integration (Quick Start)

## 1) Validate tokens (introspection)

```csharp
app.Use(async (ctx, next) => {
  var auth = ctx.Request.Headers["Authorization"].ToString();
  if (auth.StartsWith("Bearer ")) {
    var token = auth.Substring(7);
    var client = new HttpClient();
    var req = new HttpRequestMessage(HttpMethod.Get, "http://localhost:5000/api/v2/auth/verify");
    req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    var res = await client.SendAsync(req);
    if (!res.IsSuccessStatusCode) { ctx.Response.StatusCode = 401; return; }
  }
  await next();
});
```

## 2) Production (RS256 + JWKS)

Configure the platform with `RSA_PRIVATE_KEY` and `RSA_PUBLIC_KEY`. Then fetch
JWKS from:

```
GET http://localhost:5000/.well-known/jwks.json
```

Use your preferred JWT/JWKS library to verify tokens locally and cache keys.
