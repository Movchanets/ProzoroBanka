using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class StateReceiptValidatorStub : IStateReceiptValidator
{
	public Task<RegistryValidationResult> ValidateFiscalAsync(string fiscalNumber, string apiToken, CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(fiscalNumber))
			return Task.FromResult(new RegistryValidationResult(false, null, "FiscalNumber не заповнено"));

		return Task.FromResult(new RegistryValidationResult(false, null, "State validation service is not configured"));
	}

	public Task<RegistryValidationResult> ValidateBankTransferAsync(string receiptCode, string apiToken, CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(receiptCode))
			return Task.FromResult(new RegistryValidationResult(false, null, "ReceiptCode не заповнено"));

		return Task.FromResult(new RegistryValidationResult(false, null, "State validation service is not configured"));
	}
}
