namespace ProzoroBanka.Application.Common.Models;

public record QuotaDecision(
	bool Allowed,
	string? Reason
);