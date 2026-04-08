using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IStateReceiptValidator
{
	Task<RegistryValidationResult> ValidateFiscalAsync(string fiscalNumber, string apiToken, CancellationToken ct);
	Task<RegistryValidationResult> ValidateBankTransferAsync(string receiptCode, string apiToken, CancellationToken ct);
}