
using Campus.Api.Models.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Campus.Api.Endpoints;

public static class AuthEndpoints
{
    public record LoginRequest(
        string UniversityIdOrEmail,
        string Password
    );

    public static void MapAuthEndpoints(
        this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth");

        // Get an anti-forgery token before submitting
        // login or logout requests.
        auth.MapGet("/csrf", (
            HttpContext context,
            IAntiforgery antiforgery) =>
        {
            var tokens =
                antiforgery.GetAndStoreTokens(context);

            context.Response.Headers.CacheControl =
                "no-store";

            return Results.Ok(new
            {
                requestToken = tokens.RequestToken
            });
        });

        // LOGIN
        auth.MapPost("/login", async (
            LoginRequest request,
            HttpContext context,
            IAntiforgery antiforgery,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager) =>
        {
            if (!await HasValidCsrfToken(
                context, antiforgery))
            {
                return Results.BadRequest(new
                {
                    message = "Invalid request token."
                });
            }

            if (string.IsNullOrWhiteSpace(
                    request.UniversityIdOrEmail)
                || string.IsNullOrWhiteSpace(
                    request.Password))
            {
                return Results.BadRequest(new
                {
                    message = "Credentials are required."
                });
            }

            string identifier =
                request.UniversityIdOrEmail.Trim();

            ApplicationUser? user;

            if (identifier.Contains('@'))
            {
                user = await userManager
                    .FindByEmailAsync(identifier);
            }
            else
            {
                user = await userManager.Users
                    .SingleOrDefaultAsync(u =>
                        u.UniversityId == identifier);
            }

            if (user == null || !user.IsActive)
            {
                return Results.Unauthorized();
            }

            var result = await signInManager
                .PasswordSignInAsync(
                    user,
                    request.Password,
                    isPersistent: false,
                    lockoutOnFailure: true
                );

            if (!result.Succeeded)
            {
                return Results.Unauthorized();
            }

            var roles = await userManager
                .GetRolesAsync(user);

            return Results.Ok(new
            {
                message = "Login successful",
                user = new
                {
                    user.Id,
                    user.FullName,
                    user.UniversityId,
                    user.Email,
                    user.Department,
                    roles
                }
            });
        });

        // CURRENT LOGGED-IN USER
        auth.MapGet("/me", async (
            HttpContext context,
            UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager
                .GetUserAsync(context.User);

            if (user == null || !user.IsActive)
            {
                return Results.Unauthorized();
            }

            var roles = await userManager
                .GetRolesAsync(user);

            return Results.Ok(new
            {
                user.Id,
                user.FullName,
                user.UniversityId,
                user.Email,
                user.Department,
                roles
            });
        })
        .RequireAuthorization();

        // LOGOUT
        auth.MapPost("/logout", async (
            HttpContext context,
            IAntiforgery antiforgery,
            SignInManager<ApplicationUser> signInManager) =>
        {
            if (!await HasValidCsrfToken(
                context, antiforgery))
            {
                return Results.BadRequest(new
                {
                    message = "Invalid request token."
                });
            }

            await signInManager.SignOutAsync();

            return Results.Ok(new
            {
                message = "Logged out successfully"
            });
        })
        .RequireAuthorization();
    }

    private static async Task<bool> HasValidCsrfToken(
        HttpContext context,
        IAntiforgery antiforgery)
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);
            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }
}
