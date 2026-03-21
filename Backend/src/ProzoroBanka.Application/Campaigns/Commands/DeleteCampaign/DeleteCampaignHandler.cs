using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.DeleteCampaign;

public class DeleteCampaignHandler : IRequestHandler<DeleteCampaignCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public DeleteCampaignHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse> Handle(
		DeleteCampaignCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse.Failure("Збір не знайдено");

		var hasPermission = await _orgAuth.HasPermission(
			campaign.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageCampaigns, cancellationToken);

		if (!hasPermission)
			return ServiceResponse.Failure("Недостатньо прав для видалення збору");

		// Дозволено видаляти тільки збори зі статусом Draft
		if (campaign.Status != CampaignStatus.Draft)
			return ServiceResponse.Failure("Можна видалити тільки збір зі статусом Draft");

		// Очистити обкладинку якщо є
		if (!string.IsNullOrWhiteSpace(campaign.CoverImageStorageKey))
		{
			await _fileStorage.DeleteAsync(campaign.CoverImageStorageKey, cancellationToken);
		}

		// Soft delete
		campaign.IsDeleted = true;
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success("Збір видалено");
	}
}
