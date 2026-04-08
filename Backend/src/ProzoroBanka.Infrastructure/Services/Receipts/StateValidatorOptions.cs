namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class StateValidatorOptions
{
	public const string SectionName = "StateValidator";

	public bool Enabled { get; set; }
	public bool VerifyWhenDisabled { get; set; }
	public int DailyLimitPerToken { get; set; } = 900;
	public string BaseUrl { get; set; } = "https://cabinet.tax.gov.ua";
	public int TimeoutSeconds { get; set; } = 20;
	public FiscalValidationOptions Fiscal { get; set; } = new();
	public BankTransferValidationOptions BankTransfer { get; set; } = new();
}

public class FiscalValidationOptions
{
	public string EndpointPath { get; set; } = "/ws/api_public/rro/chkAll";
	public int DocumentType { get; set; } = 3;
}

public class BankTransferValidationOptions
{
	public string EndpointPath { get; set; } = "/ws/api/public/registers/registration";
}
