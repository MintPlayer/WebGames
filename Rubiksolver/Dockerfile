# Build stage - using .NET 10 SDK
FROM mcr.microsoft.com/dotnet/nightly/sdk:10.0 AS build
WORKDIR /src

# Install Node.js for npm (required for TypeScript type definitions)
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy project file and restore dependencies
COPY Rubiksolver.csproj .
RUN dotnet restore

# Copy package.json and install npm dependencies (for @types/three)
COPY package.json package-lock.json* ./
RUN npm install

# Copy all source files
COPY . .

# Build and publish the application
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/nightly/aspnet:10.0 AS runtime
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/WebGames"
WORKDIR /app

# Copy published output from build stage
COPY --from=build /app/publish .

# Expose port 80
EXPOSE 80

# Set environment variables
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

# Run the application
ENTRYPOINT ["dotnet", "Rubiksolver.dll"]

# Build: docker build -t rubiksolver .
# Run: docker run -p 80:80 rubiksolver
