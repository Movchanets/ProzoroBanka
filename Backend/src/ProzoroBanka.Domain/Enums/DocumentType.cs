namespace ProzoroBanka.Domain.Enums;

/// <summary>
/// Тип нефіскального документа для звітності волонтерів.
/// </summary>
public enum DocumentType
{
	BankReceipt = 0,
	Waybill = 1,
	Invoice = 2,
	TransferAct = 3,
	Other = 4
}
