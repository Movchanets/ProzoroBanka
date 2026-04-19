using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Purchases.Commands.CreateDraftPurchase;

public record CreateDraftPurchaseCommand(
    Guid OrganizationId,
    string Title,
    string? Description
) : IRequest<ServiceResponse<Guid>>;
