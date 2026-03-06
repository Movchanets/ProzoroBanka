namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Абстрактний контракт для операцій збереження файлів, агностичний до провайдера.
/// Реалізації: LocalFileStorage, AzureBlobStorage, AwsS3Storage, R2Storage.
/// Провайдер обирається через appsettings:Storage:Provider.
/// </summary>
public interface IFileStorage
{
    /// <summary>
    /// Завантажує потік файлу до провайдера сховища.
    /// </summary>
    /// <param name="fileStream">Потік даних файлу.</param>
    /// <param name="fileName">Оригінальне ім'я файлу (для визначення розширення/типу).</param>
    /// <param name="contentType">MIME-тип контенту.</param>
    /// <param name="cancellationToken">Токен відміни.</param>
    /// <returns>Унікальний ключ зберігання (шлях), відносний до контейнера/бакета.</returns>
    Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Генерує публічно доступний або підписаний URL для заданого ключа.
    /// </summary>
    string GetPublicUrl(string storageKey);

    /// <summary>
    /// Видаляє файл зі сховища.
    /// </summary>
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default);
}
