namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Сервіс обробки зображень (ресайз, стиснення, конвертація).
/// </summary>
public interface IImageService
{
	/// <summary>
	/// Обробляє зображення: ресайз та стиснення для профільних фото.
	/// </summary>
	/// <param name="inputStream">Вхідний потік зображення.</param>
	/// <param name="maxWidth">Максимальна ширина (px).</param>
	/// <param name="maxHeight">Максимальна висота (px).</param>
	/// <param name="quality">Якість стиснення JPEG (1-100).</param>
	/// <param name="ct">Токен відміни.</param>
	/// <returns>Потік обробленого зображення та MIME-тип.</returns>
	Task<(Stream processedStream, string contentType)> ResizeAndCompressAsync(
		Stream inputStream,
		int maxWidth = 512,
		int maxHeight = 512,
		int quality = 80,
		CancellationToken ct = default);

	/// <summary>
	/// Генерує мініатюру (thumbnail).
	/// </summary>
	Task<(Stream thumbnail, string contentType)> GenerateThumbnailAsync(
		Stream inputStream,
		int size = 128,
		CancellationToken ct = default);
}
