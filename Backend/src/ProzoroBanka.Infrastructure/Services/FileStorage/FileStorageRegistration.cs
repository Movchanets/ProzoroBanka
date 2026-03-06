using Amazon.Runtime;
using Amazon.S3;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.FileStorage;

/// <summary>
/// Реєстрація IFileStorage з вибором провайдера через appsettings:Storage:Provider.
/// </summary>
public static class FileStorageRegistration
{
	public static IServiceCollection AddFileStorage(
		this IServiceCollection services,
		IConfiguration configuration,
		IHostEnvironment environment)
	{
		var storageSection = configuration.GetSection("Storage");
		var provider = storageSection.GetValue<string>("Provider")
			?? throw new InvalidOperationException("Storage:Provider is not configured in appsettings.json");

		switch (provider.ToLowerInvariant())
		{
			case "local":
				services.AddHttpContextAccessor();
				services.Configure<LocalStorageSettings>(options =>
				{
					var localSection = storageSection.GetSection("Local");
					var relativePath = localSection.GetValue<string>("FolderName") ?? "uploads";

					var contentRoot = environment.ContentRootPath ?? Directory.GetCurrentDirectory();
					var webRoot = Path.Combine(contentRoot, "wwwroot");
					if (!Directory.Exists(webRoot))
						Directory.CreateDirectory(webRoot);

					options.BasePath = Path.Combine(webRoot, relativePath);
					options.RequestPath = $"/{relativePath}";
					options.BaseUrl = localSection.GetValue<string>("BaseUrl");
				});
				services.AddScoped<IFileStorage, LocalFileStorage>();
				break;

			case "azure":
				var azConfig = storageSection.GetSection("Azure");
				services.AddScoped<IFileStorage>(_ => new AzureBlobStorage(
					azConfig["ConnectionString"]!,
					azConfig["ContainerName"] ?? "uploads",
					azConfig["CdnUrl"]
				));
				break;

			case "s3":
				RegisterS3Compatible(services, storageSection.GetSection("S3"), forcePathStyle: false);
				break;

			case "r2":
			case "minio":
				var sectionName = provider.Equals("r2", StringComparison.OrdinalIgnoreCase) ? "R2" : "MinIO";
				RegisterS3Compatible(services, storageSection.GetSection(sectionName), forcePathStyle: true);
				break;

			default:
				throw new InvalidOperationException($"Unsupported storage provider: {provider}");
		}

		return services;
	}

	private static void RegisterS3Compatible(IServiceCollection services, IConfigurationSection config, bool forcePathStyle)
	{
		var accessKey = config["AccessKey"] ?? throw new ArgumentNullException("Storage:S3:AccessKey");
		var secretKey = config["SecretKey"] ?? throw new ArgumentNullException("Storage:S3:SecretKey");
		var region = config["Region"] ?? "us-east-1";
		var bucket = config["BucketName"] ?? throw new ArgumentNullException("Storage:S3:BucketName");
		var serviceUrl = config["ServiceUrl"];
		var publicUrl = config["PublicUrl"];

		services.AddSingleton<IAmazonS3>(_ =>
		{
			var credentials = new BasicAWSCredentials(accessKey, secretKey);
			var s3Config = new AmazonS3Config
			{
				ForcePathStyle = forcePathStyle,
			};

			if (!string.IsNullOrEmpty(serviceUrl))
				s3Config.ServiceURL = serviceUrl;
			else
				s3Config.RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(region);

			return new AmazonS3Client(credentials, s3Config);
		});

		services.AddScoped<IFileStorage>(sp => new AwsS3Storage(
			sp.GetRequiredService<IAmazonS3>(),
			bucket,
			publicUrl
		));
	}
}
