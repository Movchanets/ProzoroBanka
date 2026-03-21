using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.UploadCampaignCover;

public record UploadCampaignCoverCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	Stream FileStream,
	string FileName,
	string ContentType,
	long FileSize) : IRequest<ServiceResponse<CampaignDto>>;

public class UploadCampaignCoverCommandValidator : AbstractValidator<UploadCampaignCoverCommand>
{
	private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

	public UploadCampaignCoverCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.FileSize)
			.GreaterThan(0).WithMessage("Файл обкладинки порожній")
			.LessThanOrEqualTo(MaxFileSizeBytes).WithMessage("Файл обкладинки не повинен перевищувати 5 МБ");
	}
}
