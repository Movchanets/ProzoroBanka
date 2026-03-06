namespace ProzoroBanka.Infrastructure.Services.FileStorage;

/// <summary>
/// Settings для локального файлового сховища.
/// </summary>
public class LocalStorageSettings
{
	/// <summary>
	/// Абсолютний шлях до папки зберігання.
	/// </summary>
	public string BasePath { get; set; } = string.Empty;

	/// <summary>
	/// Шлях запиту для static files middleware (напр. "/uploads").
	/// </summary>
	public string RequestPath { get; set; } = "/uploads";

	/// <summary>
	/// Базовий URL для формування публічних посилань.
	/// </summary>
	public string? BaseUrl { get; set; }
}

/// <summary>
/// Settings для Azure Blob Storage.
/// </summary>
public class AzureBlobStorageSettings
{
	public string ConnectionString { get; set; } = string.Empty;
	public string ContainerName { get; set; } = "uploads";
	public string? CdnUrl { get; set; }
}

/// <summary>
/// Settings для AWS S3 / Cloudflare R2 / MinIO.
/// </summary>
public class S3StorageSettings
{
	public string AccessKey { get; set; } = string.Empty;
	public string SecretKey { get; set; } = string.Empty;
	public string Region { get; set; } = "us-east-1";
	public string BucketName { get; set; } = string.Empty;
	public string? ServiceUrl { get; set; }
	public string? PublicUrl { get; set; }
	public bool ForcePathStyle { get; set; }
}
