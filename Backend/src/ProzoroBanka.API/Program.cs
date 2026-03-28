using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using ProzoroBanka.API.Configuration;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.API.Filters;
using ProzoroBanka.API.Middleware;
using ProzoroBanka.API.Services;
using ProzoroBanka.Application;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Infrastructure;
using ProzoroBanka.Infrastructure.Initializer;
using Serilog;
using Scalar.AspNetCore;

// ──────────────────────────────────────────────
// Serilog bootstrap
// ──────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting ProzoroBanka API");

    var builder = WebApplication.CreateBuilder(args);

    if (Environment.GetEnvironmentVariable("IS_PLAYWRIGHT_TESTS") == "true")
    {
        builder.Configuration.AddJsonFile("appsettings.Playwright.json", optional: true, reloadOnChange: true);
    }
    // ── Serilog ──
    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // ── Application + Infrastructure layers (DI) ──
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

    // ── CurrentUserService ──
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    builder.Services.AddScoped<TurnstileValidationFilter>();

    var rateLimitingSettings = builder.Configuration.GetSection("RateLimiting").Get<RateLimitingOptions>() ?? new RateLimitingOptions();

    // ── JWT Authentication ──
    var jwtSettings = builder.Configuration.GetSection("Jwt");

    var authenticationBuilder = builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings["Key"]!)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

    var googleClientId = builder.Configuration["Google:ClientId"];
    var googleClientSecret = builder.Configuration["Google:ClientSecret"];

    if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
    {
        authenticationBuilder.AddGoogle(options =>
        {
            options.ClientId = googleClientId;
            options.ClientSecret = googleClientSecret;
        });
    }

    // ── Permission-based Authorization ──
    builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
    builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

    // ── Rate Limiting ──
    if (rateLimitingSettings.Enabled)
    {
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy("general", httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = rateLimitingSettings.General.PermitLimit,
                        Window = TimeSpan.FromSeconds(rateLimitingSettings.General.WindowSeconds),
                        QueueLimit = rateLimitingSettings.General.QueueLimit
                    }));

            options.AddPolicy("auth", httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = rateLimitingSettings.Auth.PermitLimit,
                        Window = TimeSpan.FromSeconds(rateLimitingSettings.Auth.WindowSeconds),
                        QueueLimit = rateLimitingSettings.Auth.QueueLimit
                    }));
        });
    }

    // ── Controllers ──
    builder.Services.AddControllers();

    // ── OpenAPI + Scalar ──
    builder.Services.AddOpenApi();

    // ── CORS ──
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy =>
        {
            var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? ["http://localhost:5173"];

            policy
                .WithOrigins(origins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
    });

    var app = builder.Build();

    await IdentitySeeder.SeedAsync(app.Services, builder.Configuration, builder.Environment);

    // ── Middleware pipeline ──
    app.UseGlobalExceptionHandler();
    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference(options =>
        {
            options
                .WithTitle("ProzoroBanka API")
                .WithTheme(ScalarTheme.BluePlanet)
                .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
        });

        var contentRoot = builder.Environment.ContentRootPath;
        var webRoot = Path.Combine(contentRoot, "wwwroot");

        // Якщо папки немає - створюємо її фізично
        if (!Directory.Exists(webRoot))
        {
            Directory.CreateDirectory(webRoot);
        }
        var uploadsPath = Path.Combine(contentRoot, "wwwroot", "uploads");
        if (!Directory.Exists(uploadsPath))
        {
            Directory.CreateDirectory(uploadsPath);
        }
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(uploadsPath),
            RequestPath = "/uploads" // Порожній шлях мапить файли в корінь URL
        });
    }

    app.UseHttpsRedirection();

    app.UseCors("Frontend");
    if (rateLimitingSettings.Enabled)
    {
        app.UseRateLimiter();
    }
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseOutputCache();

    app.MapHealthChecks("/health");
    app.MapControllers()
       .RequireRateLimiting("general");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;
