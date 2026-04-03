using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
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
using ProzoroBanka.Infrastructure.Services.Receipts;
using ProzoroBanka.Infrastructure.Services.Turnstile;
using ProzoroBanka.Infrastructure.Services.Cache;

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
        services.AddScoped<ISystemSettingsService, SystemSettingsService>();
        services.AddScoped<IOrganizationPlanLimitService, OrganizationPlanLimitService>();
        var useOcrExtractionStub = configuration.GetValue<bool?>("Ocr:UseExtractionStub") ?? true;
        if (useOcrExtractionStub)
        {
            services.AddScoped<IReceiptStructuredExtractionService, StubReceiptStructuredExtractionService>();
        }
        else
        {
            services.AddScoped<IReceiptStructuredExtractionService, ReceiptStructuredExtractionService>();
        }

        services.AddOptions<StateValidatorOptions>()
            .Bind(configuration.GetSection(StateValidatorOptions.SectionName))
            .Validate(options =>
            {
                if (!options.Enabled)
                    return true;

                if (!Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out _))
                    return false;

                if (options.TimeoutSeconds is < 1 or > 120)
                    return false;

                if (string.IsNullOrWhiteSpace(options.Fiscal.EndpointPath))
                    return false;

                if (string.IsNullOrWhiteSpace(options.BankTransfer.EndpointPath))
                    return false;

                return true;
            }, "StateValidator configuration is invalid")
            .ValidateOnStart();

        services.AddHttpClient<IStateReceiptValidator, TaxCabinetStateReceiptValidator>((sp, http) =>
        {
            var options = sp.GetRequiredService<IOptions<StateValidatorOptions>>().Value;
            var baseUrl = string.IsNullOrWhiteSpace(options.BaseUrl)
                ? "https://cabinet.tax.gov.ua"
                : options.BaseUrl;

            http.BaseAddress = new Uri(baseUrl);
            http.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        });
        services.AddScoped<IOcrMonthlyQuotaService, OrganizationPlanOcrMonthlyQuotaService>();
        services.AddScoped<IApiKeyDailyQuotaService, RedisApiKeyDailyQuotaService>();
        services.AddScoped<IRegistryCredentialService, RegistryCredentialService>();

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

        // ── Redis + Output Cache ──
        var redisConnection = configuration.GetValue<string>("Redis:ConnectionString");
        var redisEnabled = configuration.GetValue<bool?>("Redis:Enabled") ?? !string.IsNullOrWhiteSpace(redisConnection);
        var instanceName = configuration.GetValue<string>("Redis:InstanceName") ?? "prozoro:";

        if (redisEnabled && !string.IsNullOrWhiteSpace(redisConnection))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = instanceName;
            });

            services.AddStackExchangeRedisOutputCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = instanceName + "OutputCache:";
            });

            services.AddHealthChecks()
                .AddRedis(redisConnection, name: "redis", tags: ["cache", "redis"]);

            Console.WriteLine("[CACHE] Redis cache configured. Instance: {0}", instanceName);
        }
        else
        {
            services.AddDistributedMemoryCache();
            services.AddHealthChecks();
            Console.WriteLine("[CACHE] Redis DISABLED. Using in-memory cache.");
        }

        // Output cache policies
        AddOutputCachePolicies(services);

        // Cache invalidation service
        services.AddScoped<ICacheInvalidationService, OutputCacheInvalidationService>();

        return services;
    }

    private static void AddOutputCachePolicies(IServiceCollection services)
    {
        services.AddOutputCache(options =>
        {
            // Default — no caching
            options.AddBasePolicy(builder => builder.NoCache());

            // ── Public Organizations (анонімні, високий трафік) ──

            // Пошук/список організацій — 3 хв
            options.AddPolicy("PublicOrganizations", builder => builder
                .Expire(TimeSpan.FromMinutes(3))
                .SetVaryByQuery("query", "page", "pageSize", "verifiedOnly", "activeOnly")
                .Tag("organizations"));

            // Публічна організація за slug — 5 хв
            options.AddPolicy("PublicOrganizationBySlug", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .SetVaryByRouteValue("slug")
                .Tag("organizations"));

            // Збори організації (публічні) — 3 хв
            options.AddPolicy("PublicOrganizationCampaigns", builder => builder
                .Expire(TimeSpan.FromMinutes(3))
                .SetVaryByRouteValue("slug")
                .SetVaryByQuery("status", "page", "pageSize")
                .Tag("organizations", "campaigns"));

            // Прозорість організації — 5 хв (рідко змінюється)
            options.AddPolicy("PublicTransparency", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .SetVaryByRouteValue("slug")
                .Tag("organizations"));

            // ── Public Campaigns ──

            // Пошук/список публічних зборів — 2 хв
            options.AddPolicy("PublicCampaignSearch", builder => builder
                .Expire(TimeSpan.FromMinutes(2))
                .SetVaryByQuery("query", "status", "page", "pageSize", "verifiedOnly")
                .Tag("campaigns"));

            // Публічний збір — 2 хв (баланс змінюється часто)
            options.AddPolicy("PublicCampaign", builder => builder
                .Expire(TimeSpan.FromMinutes(2))
                .SetVaryByRouteValue("id")
                .Tag("campaigns"));

            // Чеки збору — 5 хв
            options.AddPolicy("PublicCampaignReceipts", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .SetVaryByRouteValue("id")
                .SetVaryByQuery("page", "pageSize")
                .Tag("receipts", "campaigns"));

            // Публічний чек — 10 хв (імутабельний)
            options.AddPolicy("PublicReceipt", builder => builder
                .Expire(TimeSpan.FromMinutes(10))
                .SetVaryByRouteValue("id")
                .Tag("receipts"));

            // ── Admin ──

            // Адмін: всі організації — 1 хв
            options.AddPolicy("AdminOrganizations", builder => builder
                .Expire(TimeSpan.FromMinutes(1))
                .SetVaryByQuery("page", "pageSize", "verifiedOnly")
                .Tag("admin", "organizations"));

            // Адмін: збори організації — 1 хв
            options.AddPolicy("AdminCampaigns", builder => builder
                .Expire(TimeSpan.FromMinutes(1))
                .SetVaryByRouteValue("orgId")
                .SetVaryByQuery("page", "pageSize")
                .Tag("admin", "campaigns"));
        });
    }
}
