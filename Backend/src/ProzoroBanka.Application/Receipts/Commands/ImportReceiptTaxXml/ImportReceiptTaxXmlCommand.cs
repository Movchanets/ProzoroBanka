using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ImportReceiptTaxXml;

public record ImportReceiptTaxXmlCommand(
    Guid CallerDomainUserId,
    Guid ReceiptId,
    Stream XmlStream) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
