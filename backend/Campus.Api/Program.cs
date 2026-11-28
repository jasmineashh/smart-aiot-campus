using System.Text.Json.Serialization;
using Campus.Api.Data;
using Campus.Api.Data.Seed;
using Campus.Api.Endpoints;
using Campus.Api.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// DATABASE CONFIGURATION

var connectionString = builder.Configuration
    .GetConnectionString("CampusDatabase")
    ?? throw new InvalidOperationException(
        "CampusDatabase connection string is missing.");

builder.Services.AddDbContext<CampusDbContext>(options =>
    options.UseNpgsql(connectionString));

// AUTHENTICATION & AUTHORIZATION

builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();

builder.Services.AddAuthorization();

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
});

// ASP.NET CORE IDENTITY

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 10;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.User.RequireUniqueEmail = true;
        options.Lockout.DefaultLockoutTimeSpan =
            TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<CampusDbContext>()
    .AddSignInManager();

// API SERVICES

builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter());
    });

builder.Services.AddOpenApi();

// AUTHENTICATION COOKIE CONFIGURATION

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Events.OnRedirectToLogin = context =>
    {
        if (context.Request.Path.StartsWithSegments("/api") ||
            context.Request.Path.StartsWithSegments("/biometrics.html"))
        {
            context.Response.StatusCode =
                StatusCodes.Status401Unauthorized;

            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);

        return Task.CompletedTask;
    };

    options.Events.OnRedirectToAccessDenied = context =>
    {
        if (context.Request.Path.StartsWithSegments("/api") ||
            context.Request.Path.StartsWithSegments("/biometrics.html"))
        {
            context.Response.StatusCode =
                StatusCodes.Status403Forbidden;

            return Task.CompletedTask;
        }

        context.Response.Redirect(context.RedirectUri);

        return Task.CompletedTask;
    };
});

var app = builder.Build();

// DEVELOPMENT SEEDING

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    await IdentityRoleSeeder.SeedRolesAsync(services);

    if (app.Environment.IsDevelopment())
    {
        if (app.Configuration.GetValue<bool>(
            "DevSeed:UsersEnabled"))
        {
            await DevelopmentUserSeeder.SeedAsync(services);
        }

        if (app.Configuration.GetValue<bool>(
            "DevSeed:ParkingEnabled"))
        {
            var db = services
                .GetRequiredService<CampusDbContext>();

            await ParkingDataSeeder.SeedAsync(db);
        }
    }
}

// OPENAPI & SCALAR

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// HTTP REQUEST PIPELINE

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// API ENDPOINTS
// ==========================================

// Authentication and university accounts.

app.MapAuthEndpoints();

// Parking zones, catalog and vehicle registration.

app.MapParkingEndpoints();

// Administrator parking operations.

app.MapParkingAdminEndpoints();

// Existing controllers and biometric integration.

app.MapControllers();

// ==========================================
// AUTHENTICATED BIOMETRIC DASHBOARD
// ==========================================

// Serve the dashboard through an authenticated endpoint,
// not through unrestricted static-file middleware.

app.MapGet("/biometrics.html", (HttpContext context) =>
{
    context.Response.Headers.CacheControl = "no-store";

    var path = Path.Combine(
        app.Environment.ContentRootPath,
        "wwwroot",
        "biometrics.html");

    if (!File.Exists(path))
    {
        return (IResult)Results.NotFound();
    }

    return Results.File(
        path,
        "text/html; charset=utf-8");

}).RequireAuthorization();

// TEMPORARY WEATHER TEST ENDPOINT

var summaries = new[]
{
    "Freezing",
    "Bracing",
    "Chilly",
    "Cool",
    "Mild",
    "Warm",
    "Balmy",
    "Hot",
    "Sweltering",
    "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5)
        .Select(index => new WeatherForecast(
            DateOnly.FromDateTime(
                DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[
                Random.Shared.Next(summaries.Length)]))
        .ToArray();

    return forecast;

}).WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(
    DateOnly Date,
    int TemperatureC,
    string? Summary)
{
    public int TemperatureF =>
        32 + (int)(TemperatureC / 0.5556);
}
