using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.ChangeCampaignStatus;

public record ChangeCampaignStatusCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	CampaignStatus NewStatus) : IRequest<ServiceResponse>;

public class ChangeCampaignStatusCommandValidator : AbstractValidator<ChangeCampaignStatusCommand>
{
	public ChangeCampaignStatusCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.NewStatus).IsInEnum().WithMessage("Невірний статус збору");
	}
}
