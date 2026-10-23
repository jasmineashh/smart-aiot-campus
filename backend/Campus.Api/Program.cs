
using System.Text.Json.Serialization;
using Campus.Api.Data;
using Campus.Api.Data.Seed;
using Campus.Api.Endpoints;
using Campus.Api.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// DATABASE CONFIGURATION
// ==========================================

// Use the existing Smart Campus connection-string name.
// Both parking and biometrics share this database.

var connectionString = builder.Configuration
    .GetConnectionString("CampusDatabase")
    ?? throw new InvalidOperationException(
        "CampusDatabase connection string is missing."
    );

builder.Services.AddDbContext<CampusDbContext>(options =>
    options.UseNpgsql(connectionString)
);

// ==========================================
// AUTHENTICATION & AUTHORIZATION
// ==========================================

builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();

builder.Services.AddAuthorization();

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
});

// ==========================================
// ASP.NET CORE IDENTITY
// ==========================================

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

// ==========================================
// API SERVICES
// ==========================================

// Biometrics uses MVC controllers.
// Return enum values as readable strings.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()
        );
    });

builder.Services.AddOpenApi();

var app = builder.Build();

// ==========================================
// DEVELOPMENT SEEDING
// ==========================================

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    // Existing university roles
    await IdentityRoleSeeder.SeedRolesAsync(services);

    if (app.Environment.IsDevelopment())
    {
        // Optional demo student account
        await DevelopmentUserSeeder.SeedAsync(services);

        // Optional parking demo data
        if (app.Configuration.GetValue<bool>(
            "DevSeed:ParkingEnabled"))
        {
            var db = services
                .GetRequiredService<CampusDbContext>();

            await ParkingDataSeeder.SeedAsync(db);
        }
    }
}

// ==========================================
// OPENAPI & SCALAR
// ==========================================

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// ==========================================
// HTTP REQUEST PIPELINE
// ==========================================

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// API ENDPOINTS
// ==========================================

// Existing Smart Campus authentication
app.MapAuthEndpoints();

// Existing Smart Parking APIs
app.MapParkingEndpoints();

// New biometric API controllers
app.MapControllers();

// ==========================================
// TEMPORARY WEATHER TEST ENDPOINT
// ==========================================

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool",
    "Mild", "Warm", "Balmy", "Hot",
    "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5)
        .Select(index => new WeatherForecast(
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();

    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(
    DateOnly Date,
    int TemperatureC,
    string? Summary
)
{
    public int TemperatureF =>
        32 + (int)(TemperatureC / 0.5556);
}
