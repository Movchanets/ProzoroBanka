FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY ["ProzoroBanka.slnx", "."]
COPY ["src/ProzoroBanka.Domain/ProzoroBanka.Domain.csproj", "src/ProzoroBanka.Domain/"]
COPY ["src/ProzoroBanka.Application/ProzoroBanka.Application.csproj", "src/ProzoroBanka.Application/"]
COPY ["src/ProzoroBanka.Infrastructure/ProzoroBanka.Infrastructure.csproj", "src/ProzoroBanka.Infrastructure/"]
COPY ["src/ProzoroBanka.API/ProzoroBanka.API.csproj", "src/ProzoroBanka.API/"]
RUN dotnet restore "src/ProzoroBanka.API/ProzoroBanka.API.csproj"

COPY . .
WORKDIR "/src/src/ProzoroBanka.API"
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ProzoroBanka.API.dll"]
