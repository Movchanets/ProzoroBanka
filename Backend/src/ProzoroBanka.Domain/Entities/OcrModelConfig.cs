namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Конфігурація LLM-моделі для OCR, керується через Адмінку.
/// Provider: "MistralNative" — використовує /v1/ocr API.
/// Provider: "OpenRouter"    — використовує /v1/chat/completions (OpenAI-сумісний).
/// </summary>
public class OcrModelConfig : BaseEntity
{
    /// <summary>
    /// Назва для відображення в UI (наприклад, "Mistral OCR Latest").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Ідентифікатор моделі, що передається API (наприклад, "qwen/qwen-vl-plus:free" або "mistral-ocr-latest").
    /// </summary>
    public string ModelIdentifier { get; set; } = string.Empty;

    /// <summary>
    /// Провайдер API: "MistralNative" або "OpenRouter".
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// Чи активна модель (доступна у випадайці клієнта).
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Чи є ця модель моделлю за замовчуванням.
    /// </summary>
    public bool IsDefault { get; set; }
}
