using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.AttachReceiptToCampaign;

public class AttachReceiptToCampaignHandler : IRequestHandler<AttachReceiptToCampaignCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public AttachReceiptToCampaignHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(AttachReceiptToCampaignCommand request, CancellationToken ct)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, ct);

		if (campaign is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Збір не знайдено");

		var isMember = await _orgAuth.IsMember(campaign.OrganizationId, request.CallerDomainUserId, ct);
		if (!isMember)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Немає доступу до організації");

		var receipt = await _db.Receipts
			.Include(r => r.Campaign)
			.Include(r => r.ItemPhotos)
			.FirstOrDefaultAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);

		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		if (receipt.Status != ReceiptStatus.StateVerified)
			return ServiceResponse<ReceiptPipelineDto>.Failure("До збору можна прикріпити лише верифікований чек");

		receipt.CampaignId = campaign.Id;
		await _db.SaveChangesAsync(ct);
		receipt.Campaign = campaign;

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
