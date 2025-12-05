# Build stage - using .NET 10 SDK (latest stable)
FROM mcr.microsoft.com/dotnet/nightly/sdk:10.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY Game2048.csproj .
RUN dotnet restore

# Copy source code
COPY . .

# Build and publish the application
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/nightly/aspnet:10.0 AS runtime
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/WebGames"
WORKDIR /app

# Copy published application
COPY --from=build /app/publish .

# Expose port 80
EXPOSE 80

# Set environment variable for ASP.NET Core
ENV ASPNETCORE_URLS=http://+:80

# Run the application
ENTRYPOINT ["dotnet", "Game2048.dll"]

# Build: docker build -t game2048 .
# Run: docker run -p 80:80 game2048
