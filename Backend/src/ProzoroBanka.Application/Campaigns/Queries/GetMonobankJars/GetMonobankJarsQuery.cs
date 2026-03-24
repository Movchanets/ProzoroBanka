using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Queries.GetMonobankJars;

public record GetMonobankJarsQuery(string Token) : IRequest<ServiceResponse<MonobankClientInfoDto>>;

public class GetMonobankJarsQueryValidator : AbstractValidator<GetMonobankJarsQuery>
{
	public GetMonobankJarsQueryValidator()
	{
		RuleFor(x => x.Token)
			.NotEmpty().WithMessage("Токен обов'язковий")
			.MaximumLength(200).WithMessage("Токен занадто довгий");
	}
}
