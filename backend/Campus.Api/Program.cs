
using Campus.Api.Data;
using Campus.Api.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// DATABASE CONFIGURATION
// ==========================================

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
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<CampusDbContext>()
    .AddSignInManager();

// ==========================================
// API SERVICES
// ==========================================

builder.Services.AddOpenApi();

var app = builder.Build();

// ==========================================
// HTTP REQUEST PIPELINE
// ==========================================

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Authenticate users before checking permissions
app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// TEMPORARY TEST ENDPOINT
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
