using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Fallback Orchestrator: Primary (Azure DI) → Fallback (Mistral) → Fail.
/// </summary>
public class FallbackOcrService : IOcrService
{
	private readonly AzureDocumentIntelligenceOcrService? _primaryService;
	private readonly MistralOcrService _fallbackService;
	private readonly ILogger<FallbackOcrService> _logger;

	public string ProviderName => "FallbackOrchestrator";

	public FallbackOcrService(
		IServiceProvider serviceProvider,
		MistralOcrService fallbackService,
		ILogger<FallbackOcrService> logger)
	{
		_primaryService = serviceProvider.GetService<AzureDocumentIntelligenceOcrService>();
		_fallbackService = fallbackService;
		_logger = logger;
	}

	public async Task<OcrResult> ParseReceiptAsync(Stream imageStream, string fileName, CancellationToken ct = default)
	{
		if (_primaryService is null)
		{
			_logger.LogWarning("Primary OCR is not configured. Using fallback provider {FallbackProvider} for {FileName}",
				_fallbackService.ProviderName, fileName);
			return await _fallbackService.ParseReceiptAsync(imageStream, fileName, ct);
		}

		// 1. Спробувати Primary (Azure Document Intelligence)
		_logger.LogInformation("Attempting primary OCR ({Provider}) for {FileName}", _primaryService.ProviderName, fileName);

		// Зберігаємо позицію потоку для повторного читання
		var memoryStream = new MemoryStream();
		await imageStream.CopyToAsync(memoryStream, ct);

		memoryStream.Position = 0;
		var primaryResult = await _primaryService.ParseReceiptAsync(memoryStream, fileName, ct);

		if (primaryResult.Success)
		{
			_logger.LogInformation("Primary OCR succeeded for {FileName}", fileName);
			return primaryResult;
		}

		// 2. Fallback до Mistral
		_logger.LogWarning("Primary OCR failed ({Error}), falling back to {FallbackProvider}",
			primaryResult.ErrorMessage, _fallbackService.ProviderName);

		memoryStream.Position = 0;
		var fallbackResult = await _fallbackService.ParseReceiptAsync(memoryStream, fileName, ct);

		if (fallbackResult.Success)
		{
			_logger.LogInformation("Fallback OCR succeeded for {FileName}", fileName);
			return fallbackResult;
		}

		// 3. Обидва failed — повертаємо draft для ручного введення
		_logger.LogError("Both OCR providers failed for {FileName}. Primary: {PrimaryError}, Fallback: {FallbackError}",
			fileName, primaryResult.ErrorMessage, fallbackResult.ErrorMessage);

		return new OcrResult(
			Success: false,
			MerchantName: null,
			TotalAmount: null,
			TransactionDate: null,
			RawJson: null,
			ErrorMessage: $"All OCR providers failed. Primary: {primaryResult.ErrorMessage}; Fallback: {fallbackResult.ErrorMessage}"
		);
	}
}
