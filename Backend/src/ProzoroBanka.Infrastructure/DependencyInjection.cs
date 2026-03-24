using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ProzoroBanka.Application.Contracts.Email;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Interfaces;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.Infrastructure.Identity;
using ProzoroBanka.Infrastructure.Repositories;
using ProzoroBanka.Infrastructure.Services;
using ProzoroBanka.Infrastructure.Services.Auth;
using ProzoroBanka.Infrastructure.Services.Email;
using ProzoroBanka.Infrastructure.Services.Encryption;
using ProzoroBanka.Infrastructure.Services.FileStorage;
using ProzoroBanka.Infrastructure.Services.Image;
using ProzoroBanka.Infrastructure.Services.Ocr;
using ProzoroBanka.Infrastructure.Services.Turnstile;
using StackExchange.Redis;

namespace ProzoroBanka.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        // ── Database ──
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // ── Identity ──
        services.AddIdentity<ApplicationUser, RoleEntity>(options =>
        {
            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = false; // MVP: без підтвердження email
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, ClaimsPrincipalFactory>();

        // ── Auth services ──
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<ITokenEncryptionService, AesTokenEncryptionService>();
        services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IEmailNotificationService, SmtpEmailNotificationService>();

        // ── Repositories ──
        services.AddScoped<IOrganizationRepository, OrganizationRepository>();
        services.AddScoped<IInvitationRepository, InvitationRepository>();

        // ── File Storage (provider з appsettings) ──
        services.AddFileStorage(configuration, environment);

        // ── OCR (provider з appsettings) ──
        services.AddOcrServices(configuration);

        // ── Image processing ──
        services.AddScoped<IImageService, SkiaImageService>();

        // ── Turnstile ──
        services.AddHttpClient<ITurnstileService, TurnstileService>();

        // ── Monobank stateless proxy ──
        services.AddHttpClient<IMonobankStatelessProxyService, ProzoroBanka.Infrastructure.Services.Monobank.MonobankStatelessProxyService>(
            (sp, http) =>
            {
                http.BaseAddress = new Uri("https://api.monobank.ua/");
                http.Timeout = TimeSpan.FromSeconds(15);
            });

        // ── Redis ──
        var redisConnection = configuration.GetValue<string>("Redis:ConnectionString");
        var redisEnabled = configuration.GetValue<bool?>("Redis:Enabled") ?? !string.IsNullOrWhiteSpace(redisConnection);

        if (redisEnabled && !string.IsNullOrWhiteSpace(redisConnection))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnection));
        }

        return services;
    }
}
