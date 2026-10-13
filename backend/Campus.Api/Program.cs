
using Campus.Api.Data;
using Campus.Api.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

using Campus.Api.Data.Seed;

using Campus.Api.Endpoints;



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
        
        // Limit repeated failed login attempts
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

builder.Services.AddOpenApi();

var app = builder.Build();


// ==========================================
// INITIAL UNIVERSITY ROLES
// ==========================================


using (var scope = app.Services.CreateScope())
{
    await IdentityRoleSeeder.SeedRolesAsync(
        scope.ServiceProvider
    );

    if (app.Environment.IsDevelopment())
    {
        await DevelopmentUserSeeder.SeedAsync(
            scope.ServiceProvider
        );
    }
}



// ==========================================
// HTTP REQUEST PIPELINE
// ==========================================

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}


if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}


// Authenticate users before checking permissions
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();


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
