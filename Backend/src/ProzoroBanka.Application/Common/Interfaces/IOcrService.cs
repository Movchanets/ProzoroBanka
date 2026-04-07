using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Абстрактний контракт для OCR-сервісу парсингу чеків.
/// Реалізації: MistralOcrService, OpenRouterOcrService.
/// Конкретний сервіс обирається через IOcrServiceFactory на основі OcrModelConfig.
/// </summary>
public interface IOcrService
{
    /// <summary>
    /// Ім'я провайдера для логування.
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// Парсить зображення чека та повертає структуровані дані.
    /// </summary>
    Task<OcrResult> ParseReceiptAsync(Stream imageStream, string fileName, string? modelIdentifier = null, CancellationToken ct = default);
}
