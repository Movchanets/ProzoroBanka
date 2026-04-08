namespace ProzoroBanka.Application.OcrModels.DTOs;

public record OcrModelConfigDto(
    Guid Id,
    string Name,
    string ModelIdentifier,
    string Provider,
    bool IsActive,
    bool IsDefault
);
