using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MyPal.Desktop.Models;

public sealed record ProfileListResponse(
    [property: JsonPropertyName("profiles")] IReadOnlyList<ProfileSummary> Profiles,
    [property: JsonPropertyName("lastUsedId")] string? LastUsedId,
    [property: JsonPropertyName("maxProfiles")] int MaxProfiles);

public sealed record ProfileSummary
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("createdAt")] public long? CreatedAt { get; init; }
    [JsonPropertyName("lastPlayedAt")] public long? LastPlayedAt { get; init; }
    [JsonPropertyName("level")] public int? Level { get; init; }
    [JsonPropertyName("xp")] public int? Xp { get; init; }
    [JsonPropertyName("messageCount")] public int? MessageCount { get; init; }
    [JsonPropertyName("memoryCount")] public int? MemoryCount { get; init; }
}

public sealed record ProfileOperationResponse(
    [property: JsonPropertyName("success")] bool Success,
    [property: JsonPropertyName("profile")] ProfileMetadata? Profile,
    [property: JsonPropertyName("error")] string? Error);

public sealed record ProfileMetadata
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("createdAt")] public long CreatedAt { get; init; }
    [JsonPropertyName("lastPlayedAt")] public long LastPlayedAt { get; init; }
    [JsonPropertyName("level")] public int Level { get; init; }
    [JsonPropertyName("xp")] public int Xp { get; init; }
    [JsonPropertyName("messageCount")] public int MessageCount { get; init; }
    [JsonPropertyName("memoryCount")] public int MemoryCount { get; init; }
    [JsonPropertyName("version")] public string? Version { get; init; }
}

public sealed record ChatLogResponse(
    [property: JsonPropertyName("messages")] IReadOnlyList<ChatMessage> Messages,
    [property: JsonPropertyName("total")] int Total);

public sealed record ChatMessage
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("role")] public string Role { get; init; } = string.Empty;
    [JsonPropertyName("text")] public string Text { get; init; } = string.Empty;
    [JsonPropertyName("ts")] public long Timestamp { get; init; }
    [JsonPropertyName("kind")] public string? Kind { get; init; }
}

public sealed record ChatResponse
{
    [JsonPropertyName("reply")] public string Reply { get; init; } = string.Empty;
    [JsonPropertyName("kind")] public string? Kind { get; init; }
    [JsonPropertyName("xpGained")] public int XpGained { get; init; }
    [JsonPropertyName("level")] public int Level { get; init; }
    [JsonPropertyName("memoryCount")] public int MemoryCount { get; init; }
    [JsonPropertyName("memoryStored")] public bool MemoryStored { get; init; }
    [JsonPropertyName("memoryImportance")] public MemoryImportance? MemoryImportance { get; init; }
    [JsonPropertyName("thoughtId")] public string? ThoughtId { get; init; }
    [JsonPropertyName("emotion")] public EmotionState? Emotion { get; init; }
}

public sealed record MemoryImportance
{
    [JsonPropertyName("score")] public double Score { get; init; }
    [JsonPropertyName("level")] public string? Level { get; init; }
    [JsonPropertyName("reasons")] public IReadOnlyList<string>? Reasons { get; init; }
}

public sealed record EmotionState
{
    [JsonPropertyName("mood")] public string? Mood { get; init; }
    [JsonPropertyName("intensity")] public double Intensity { get; init; }
    [JsonPropertyName("expression")] public string? Expression { get; init; }
    [JsonPropertyName("description")] public string? Description { get; init; }
}

public sealed record StatsResponse
{
    [JsonPropertyName("level")] public int Level { get; init; }
    [JsonPropertyName("xp")] public int Xp { get; init; }
    [JsonPropertyName("cp")] public int Cp { get; init; }
    [JsonPropertyName("settings")] public SettingsDto? Settings { get; init; }
    [JsonPropertyName("personality")] public PersonalityDto? Personality { get; init; }
    [JsonPropertyName("vocabSize")] public int VocabSize { get; init; }
    [JsonPropertyName("memoryCount")] public int MemoryCount { get; init; }
    [JsonPropertyName("currentEmotion")] public EmotionState? CurrentEmotion { get; init; }
    [JsonPropertyName("advancement")] public AdvancementDto? Advancement { get; init; }
}

public sealed record SettingsDto
{
    [JsonPropertyName("xpMultiplier")] public double XpMultiplier { get; init; }
    [JsonPropertyName("apiProvider")] public string? ApiProvider { get; init; }
    [JsonPropertyName("telemetry")] public bool Telemetry { get; init; }
    [JsonPropertyName("authRequired")] public bool AuthRequired { get; init; }
    [JsonPropertyName("apiKeyMask")] public string? ApiKeyMask { get; init; }
}

public sealed record AdvancementDto
{
    [JsonPropertyName("currentLevel")] public int CurrentLevel { get; init; }
    [JsonPropertyName("currentXp")] public int CurrentXp { get; init; }
    [JsonPropertyName("nextLevelThreshold")] public int NextLevelThreshold { get; init; }
    [JsonPropertyName("previousLevelThreshold")] public int PreviousLevelThreshold { get; init; }
    [JsonPropertyName("xpForCurrentLevel")] public int XpForCurrentLevel { get; init; }
    [JsonPropertyName("xpNeededForNextLevel")] public int XpNeededForNextLevel { get; init; }
    [JsonPropertyName("xpRemaining")] public int XpRemaining { get; init; }
    [JsonPropertyName("progressPercent")] public double ProgressPercent { get; init; }
}

public sealed record PersonalityDto
{
    [JsonPropertyName("traits")] public IReadOnlyDictionary<string, double>? Traits { get; init; }
    [JsonPropertyName("tags")] public IReadOnlyList<string>? Tags { get; init; }
}

public sealed record BrainGraphResponse(
    [property: JsonPropertyName("nodes")] IReadOnlyList<BrainNode> Nodes,
    [property: JsonPropertyName("links")] IReadOnlyList<BrainLink> Links,
    [property: JsonPropertyName("concepts")] IReadOnlyList<ConceptSummary> Concepts);

public sealed record BrainNode
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("label")] public string Label { get; init; } = string.Empty;
    [JsonPropertyName("value")] public double Value { get; init; }
    [JsonPropertyName("group")] public string? Group { get; init; }
    [JsonPropertyName("sentiment")] public string? Sentiment { get; init; }
}

public sealed record BrainLink
{
    [JsonPropertyName("from")] public string From { get; init; } = string.Empty;
    [JsonPropertyName("to")] public string To { get; init; } = string.Empty;
    [JsonPropertyName("value")] public double Value { get; init; }
    [JsonPropertyName("type")] public string? Type { get; init; }
}

public sealed record ConceptSummary
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("category")] public string? Category { get; init; }
    [JsonPropertyName("totalMentions")] public int TotalMentions { get; init; }
    [JsonPropertyName("importanceScore")] public double ImportanceScore { get; init; }
    [JsonPropertyName("sentiment")] public SentimentSummary? Sentiment { get; init; }
    [JsonPropertyName("keywords")] public IReadOnlyList<KeywordSummary>? Keywords { get; init; }
    [JsonPropertyName("importance")] public ImportanceBreakdown? Importance { get; init; }
    [JsonPropertyName("levelRange")] public object? LevelRange { get; init; }
    [JsonPropertyName("lastSeen")] public long? LastSeen { get; init; }
}

public sealed record SentimentSummary
{
    [JsonPropertyName("average")] public double Average { get; init; }
    [JsonPropertyName("label")] public string? Label { get; init; }
}

public sealed record KeywordSummary
{
    [JsonPropertyName("word")] public string Word { get; init; } = string.Empty;
    [JsonPropertyName("count")] public int Count { get; init; }
}

public sealed record ImportanceBreakdown
{
    [JsonPropertyName("score")] public double Score { get; init; }
    [JsonPropertyName("level")] public string? Level { get; init; }
    [JsonPropertyName("reasons")] public IReadOnlyList<string>? Reasons { get; init; }
}

public sealed record NeuralNetworkResponse
{
    [JsonPropertyName("regions")] public IReadOnlyList<NeuralRegion> Regions { get; init; } = Array.Empty<NeuralRegion>();
    [JsonPropertyName("metrics")] public NeuralMetrics? Metrics { get; init; }
    [JsonPropertyName("recentEvents")] public IReadOnlyList<NeuralEvent> RecentEvents { get; init; } = Array.Empty<NeuralEvent>();
}

public sealed record NeuralRegion
{
    [JsonPropertyName("regionId")] public string RegionId { get; init; } = string.Empty;
    [JsonPropertyName("regionName")] public string RegionName { get; init; } = string.Empty;
    [JsonPropertyName("position")] public PositionDto? Position { get; init; }
    [JsonPropertyName("color")] public string? Color { get; init; }
    [JsonPropertyName("size")] public double Size { get; init; }
    [JsonPropertyName("neuronCount")] public int NeuronCount { get; init; }
    [JsonPropertyName("activityLevel")] public double ActivityLevel { get; init; }
    [JsonPropertyName("developedAtLevel")] public int DevelopedAtLevel { get; init; }
}

public sealed record PositionDto
{
    [JsonPropertyName("x")] public double X { get; init; }
    [JsonPropertyName("y")] public double Y { get; init; }
    [JsonPropertyName("z")] public double Z { get; init; }
}

public sealed record NeuralMetrics
{
    [JsonPropertyName("neuronCount")] public int NeuronCount { get; init; }
    [JsonPropertyName("synapseCount")] public int SynapseCount { get; init; }
    [JsonPropertyName("averageActivation")] public double AverageActivation { get; init; }
    [JsonPropertyName("recentFiringRate")] public double RecentFiringRate { get; init; }
    [JsonPropertyName("developmentStage")] public string? DevelopmentStage { get; init; }
}

public sealed record NeuralEvent
{
    [JsonPropertyName("ts")] public long Timestamp { get; init; }
    [JsonPropertyName("type")] public string? Type { get; init; }
    [JsonPropertyName("regionId")] public string? RegionId { get; init; }
    [JsonPropertyName("description")] public string? Description { get; init; }
}

public sealed record MemoriesResponse(
    [property: JsonPropertyName("memories")] IReadOnlyList<MemoryEntry> Memories,
    [property: JsonPropertyName("total")] int Total);

public sealed record MemoryEntry
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("ts")] public long Timestamp { get; init; }
    [JsonPropertyName("userText")] public string? UserText { get; init; }
    [JsonPropertyName("palText")] public string? PalText { get; init; }
    [JsonPropertyName("summary")] public string? Summary { get; init; }
    [JsonPropertyName("sentiment")] public string? Sentiment { get; init; }
    [JsonPropertyName("importance")] public MemoryImportanceDetail? Importance { get; init; }
}

public sealed record MemoryImportanceDetail
{
    [JsonPropertyName("score")] public double Score { get; init; }
    [JsonPropertyName("level")] public string? Level { get; init; }
    [JsonPropertyName("shouldRemember")] public bool ShouldRemember { get; init; }
    [JsonPropertyName("reasons")] public IReadOnlyList<string>? Reasons { get; init; }
}

public sealed record JournalResponse(
    [property: JsonPropertyName("thoughts")] IReadOnlyList<ThoughtEntry> Thoughts,
    [property: JsonPropertyName("total")] int Total);

public sealed record ThoughtEntry
{
    [JsonPropertyName("id")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("ts")] public long Timestamp { get; init; }
    [JsonPropertyName("title")] public string? Title { get; init; }
    [JsonPropertyName("body")] public string? Body { get; init; }
    [JsonPropertyName("tags")] public IReadOnlyList<string>? Tags { get; init; }
    [JsonPropertyName("category")] public string? Category { get; init; }
    [JsonPropertyName("importance")] public ImportanceBreakdown? Importance { get; init; }
}

public sealed record SettingsRequest
{
    [JsonPropertyName("xpMultiplier")] public double? XpMultiplier { get; init; }
    [JsonPropertyName("apiProvider")] public string? ApiProvider { get; init; }
    [JsonPropertyName("apiKey")] public string? ApiKey { get; init; }
    [JsonPropertyName("telemetry")] public bool? Telemetry { get; init; }
    [JsonPropertyName("authRequired")] public bool? AuthRequired { get; init; }
}

public sealed record SettingsResponse(
    [property: JsonPropertyName("settings")] SettingsDto? Settings);
