namespace ProzoroBanka.Application.Common.Models;

public record RegistryValidationResult(
	bool IsVerified,
	string? VerificationReference,
	string? FailureReason
);