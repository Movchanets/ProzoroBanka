using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

public class OcrServiceFactory : IOcrServiceFactory
{
	private readonly IApplicationDbContext _db;
	private readonly IServiceProvider _serviceProvider;
	private readonly ILogger<OcrServiceFactory> _logger;

	public OcrServiceFactory(
		IApplicationDbContext db,
		IServiceProvider serviceProvider,
		ILogger<OcrServiceFactory> logger)
	{
		_db = db;
		_serviceProvider = serviceProvider;
		_logger = logger;
	}

	public async Task<(IOcrService Service, string ModelId)> ResolveAsync(string? modelIdentifier, CancellationToken ct)
	{
		// 1. Знайдемо модель в БД
		var query = _db.OcrModelConfigs.Where(m => m.IsActive);
		
		var config = !string.IsNullOrWhiteSpace(modelIdentifier)
			? await query.FirstOrDefaultAsync(m => m.ModelIdentifier == modelIdentifier, ct)
			: await query.FirstOrDefaultAsync(m => m.IsDefault, ct);

		if (config is null && !string.IsNullOrWhiteSpace(modelIdentifier))
		{
			_logger.LogWarning("Model {Model} not found or inactive. Falling back to default.", modelIdentifier);
			config = await query.FirstOrDefaultAsync(m => m.IsDefault, ct);
		}

		if (config is null)
		{
			// Hardcoded fallback якщо в БД порожньо
			_logger.LogWarning("No active default OCR model found in DB. Falling back to Mistral.");
			var fallbackService = _serviceProvider.GetRequiredService<MistralOcrService>();
			return (fallbackService, "mistral-ocr-latest");
		}

		// 2. Інстанціюємо правильний сервіс
		IOcrService service = config.Provider switch
		{
			"MistralNative" => _serviceProvider.GetRequiredService<MistralOcrService>(),
			"OpenRouter" => _serviceProvider.GetRequiredService<OpenRouterOcrService>(),
			_ => throw new InvalidOperationException($"Unknown OCR provider: {config.Provider}")
		};

		return (service, config.ModelIdentifier);
	}
}
