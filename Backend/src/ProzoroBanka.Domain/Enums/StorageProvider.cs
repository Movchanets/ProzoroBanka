namespace ProzoroBanka.Domain.Enums;

/// <summary>
/// Провайдер збереження файлів — визначається через appsettings.
/// </summary>
public enum StorageProvider
{
	Local = 0,
	Azure = 1,
	S3 = 2,
	R2 = 3,
	MinIO = 4
}
