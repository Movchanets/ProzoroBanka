using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.VerifyReceipt;

public class VerifyReceiptHandler : IRequestHandler<VerifyReceiptCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IStateReceiptValidator _validator;
	private readonly IRegistryCredentialService _credentialService;
	private readonly IApiKeyDailyQuotaService _quotaService;
	private readonly IFileStorage _fileStorage;

	public VerifyReceiptHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IStateReceiptValidator validator,
		IRegistryCredentialService credentialService,
		IApiKeyDailyQuotaService quotaService,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_validator = validator;
		_credentialService = credentialService;
		_quotaService = quotaService;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(VerifyReceiptCommand request, CancellationToken ct)
	{
		var receiptAccess = await _db.FindManageableOrganizationReceiptAsync(
			_orgAuth,
			request.ReceiptId,
			request.CallerDomainUserId,
			expectedOrganizationId: request.OrganizationId,
			ct);

		if (!receiptAccess.IsSuccess)
			return ServiceResponse<ReceiptPipelineDto>.Failure(receiptAccess.Message);

		var receipt = receiptAccess.Payload!;

		if (receipt.Status != ReceiptStatus.OcrExtracted && receipt.Status != ReceiptStatus.FailedVerification && receipt.Status != ReceiptStatus.ValidationDeferredRateLimit)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не готовий до державної верифікації");

		if (receipt.RegistryType is null)
		{
			receipt.RegistryType = !string.IsNullOrWhiteSpace(receipt.FiscalNumber)
				? RegistryReceiptType.Fiscal
				: !string.IsNullOrWhiteSpace(receipt.ReceiptCode)
					? RegistryReceiptType.BankTransfer
					: null;
		}

		if (receipt.RegistryType is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Не вдалося визначити тип реєстрової перевірки");

		var provider = receipt.RegistryType == RegistryReceiptType.Fiscal
			? RegistryProvider.TaxService
			: RegistryProvider.CheckGovUa;

		var hasKey = await _credentialService.HasActiveKeyAsync(request.OrganizationId, provider, ct);
		if (!hasKey.IsSuccess || !hasKey.Payload)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Відсутній активний ключ державного реєстру для організації");

		var key = await _credentialService.DecryptApiKeyAsync(request.OrganizationId, provider, ct);
		if (!key.IsSuccess)
			return ServiceResponse<ReceiptPipelineDto>.Failure(key.Message);
		if (string.IsNullOrWhiteSpace(key.Payload))
			return ServiceResponse<ReceiptPipelineDto>.Failure("Не вдалося отримати API ключ державного реєстру");

		var keyFingerprint = key.Payload.Length <= 8 ? key.Payload : key.Payload[^8..];
		var quota = await _quotaService.TryConsumeAsync(keyFingerprint, DateTime.UtcNow, ct);
		if (!quota.Allowed)
		{
			receipt.Status = ReceiptStatus.ValidationDeferredRateLimit;
			receipt.VerificationFailureReason = quota.Reason ?? "Досягнуто добовий ліміт валідацій для ключа";
			await _db.SaveChangesAsync(ct);
			return ServiceResponse<ReceiptPipelineDto>.Failure(receipt.VerificationFailureReason);
		}

		RegistryValidationResult validation;
		if (receipt.RegistryType == RegistryReceiptType.Fiscal)
		{
			if (string.IsNullOrWhiteSpace(receipt.FiscalNumber))
				return ServiceResponse<ReceiptPipelineDto>.Failure("FiscalNumber відсутній");
			validation = await _validator.ValidateFiscalAsync(receipt.FiscalNumber, key.Payload, ct);
		}
		else
		{
			if (string.IsNullOrWhiteSpace(receipt.ReceiptCode))
				return ServiceResponse<ReceiptPipelineDto>.Failure("ReceiptCode відсутній");
			validation = await _validator.ValidateBankTransferAsync(receipt.ReceiptCode, key.Payload, ct);
		}

		receipt.StateVerificationReference = validation.VerificationReference;
		if (validation.IsVerified)
		{
			receipt.Status = ReceiptStatus.StateVerified;
			receipt.StateVerifiedAtUtc = DateTime.UtcNow;
			receipt.VerificationFailureReason = null;
			if (string.IsNullOrWhiteSpace(receipt.StateVerificationReference)
				&& ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var verificationUrl, out _))
			{
				receipt.StateVerificationReference = verificationUrl;
			}
		}
		else
		{
			if (ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var verificationUrl, out _))
			{
				receipt.Status = ReceiptStatus.StateVerified;
				receipt.StateVerifiedAtUtc = DateTime.UtcNow;
				receipt.StateVerificationReference = verificationUrl;
				receipt.VerificationFailureReason = null;
			}
			else
			{
				receipt.Status = ReceiptStatus.FailedVerification;
				receipt.VerificationFailureReason = validation.FailureReason ?? "Державна верифікація неуспішна";
			}
		}

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
