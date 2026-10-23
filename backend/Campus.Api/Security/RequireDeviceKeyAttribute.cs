using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Campus.Api.Security;

// Put [RequireDeviceKey] on an endpoint so only the AI camera service can call it.
// The caller must send the header:  X-Device-Key: <secret key>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireDeviceKeyAttribute : Attribute, IAuthorizationFilter
{
    public const string HeaderName = "X-Device-Key";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var expectedKey = config["Security:DeviceApiKey"];

        if (string.IsNullOrEmpty(expectedKey))
        {
            context.Result = new ObjectResult(new { message = "Device API key is not configured on the server." })
            {
                StatusCode = StatusCodes.Status500InternalServerError
            };
            return;
        }

        var hasHeader = context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var providedKey);

        // FixedTimeEquals compares safely, so attackers can't guess the key by timing the response
        var isValid = hasHeader && CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(providedKey.ToString()),
            Encoding.UTF8.GetBytes(expectedKey));

        if (!isValid)
            context.Result = new UnauthorizedObjectResult(new { message = $"Missing or invalid {HeaderName} header." });
    }
}