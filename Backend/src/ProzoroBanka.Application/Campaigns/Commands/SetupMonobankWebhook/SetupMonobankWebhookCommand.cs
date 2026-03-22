using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.SetupMonobankWebhook;

public record SetupMonobankWebhookCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	string Token,
	string SelectedJarAccountId,
	string WebhookUrl) : IRequest<ServiceResponse>;

public class SetupMonobankWebhookCommandValidator : AbstractValidator<SetupMonobankWebhookCommand>
{
	public SetupMonobankWebhookCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.Token)
			.NotEmpty().WithMessage("Токен обов'язковий")
			.MaximumLength(200).WithMessage("Токен занадто довгий");
		RuleFor(x => x.SelectedJarAccountId)
			.NotEmpty().WithMessage("ID рахунку/банки обов'язковий")
			.MaximumLength(128);
		RuleFor(x => x.WebhookUrl)
			.NotEmpty().WithMessage("URL webhook обов'язковий")
			.MaximumLength(512);
	}
}
