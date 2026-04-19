namespace ProzoroBanka.Domain.Enums;

/// <summary>
/// Стан обробки OCR для документа.
/// NotRequired — використовується для TransferAct (безпекове обмеження).
/// </summary>
public enum OcrProcessingStatus
{
	NotRequired = 0,
	NotProcessed = 1,
	Processing = 2,
	Success = 3,
	Failed = 4
}
