using ProzoroBanka.Application.Common.Interfaces;
using SkiaSharp;

namespace ProzoroBanka.Infrastructure.Services.Image;

/// <summary>
/// Сервіс обробки зображень на базі SkiaSharp (кросплатформний).
/// </summary>
public class SkiaImageService : IImageService
{
	public Task<(Stream processedStream, string contentType)> ResizeAndCompressAsync(
		Stream inputStream, int maxWidth = 512, int maxHeight = 512, int quality = 80,
		CancellationToken ct = default)
	{
		using var original = SKBitmap.Decode(inputStream);
		if (original == null)
			throw new InvalidOperationException("Could not decode image");

		var (newWidth, newHeight) = CalculateNewDimensions(original.Width, original.Height, maxWidth, maxHeight);
		var sampling = new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.None);

		using var resized = original.Resize(new SKImageInfo(newWidth, newHeight), sampling)
			?? throw new InvalidOperationException("Could not resize image");
		using var image = SKImage.FromBitmap(resized);
		var data = image.Encode(SKEncodedImageFormat.Jpeg, quality);

		var outputStream = new MemoryStream();
		data.SaveTo(outputStream);
		outputStream.Position = 0;

		return Task.FromResult<(Stream, string)>((outputStream, "image/jpeg"));
	}

	public Task<(Stream thumbnail, string contentType)> GenerateThumbnailAsync(
		Stream inputStream, int size = 128, CancellationToken ct = default)
	{
		return ResizeAndCompressAsync(inputStream, size, size, 70, ct);
	}

	private static (int width, int height) CalculateNewDimensions(
		int originalWidth, int originalHeight, int maxWidth, int maxHeight)
	{
		if (originalWidth <= maxWidth && originalHeight <= maxHeight)
			return (originalWidth, originalHeight);

		var ratioX = (double)maxWidth / originalWidth;
		var ratioY = (double)maxHeight / originalHeight;
		var ratio = Math.Min(ratioX, ratioY);

		return ((int)(originalWidth * ratio), (int)(originalHeight * ratio));
	}
}
