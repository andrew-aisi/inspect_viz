#!/usr/bin/env python3
# type: ignore
"""
Script to prepare benchmark data download from https://epoch.ai/data/benchmark_data.zip
for data visualization. Final data frame includes:
- model
- model_short_name
- organization
- release_date
- benchmark
- score
- scorer
- stderr
- log_viewer
"""

import pandas as pd
import numpy as np
from pathlib import Path
import re
from datetime import datetime

# Define data directory
DATA_DIR = Path(__file__).parent / "data"

# Target benchmarks with their display names
BENCHMARK_MAPPING = {
    "FrontierMath-2025-02-28-Public": "Frontier Math",
    "GPQA diamond": "GPQA Diamond", 
    "MATH level 5": "Math Level 5",
    "OTIS Mock AIME 2024-2025": "OTIS Mock Aime 2024-2025",
    "SWE-Bench verified": "SWE-bench Verified"
}

# Model prefix to organization mapping
MODEL_TO_ORG = {
    "claude": "Anthropic",
    "gpt": "OpenAI",
    "o1": "OpenAI",
    "o3": "OpenAI",
    "o4": "OpenAI",
    "gemini": "Google",
    "gemma": "Google",
    "grok": "xAI",
    "mistral": "Mistral AI",
    "ministral": "Mistral AI",
    "magistral": "Mistral AI",
    "open-mistral":  "Mistral AI",
    "mixtral": "Mistral AI",
    "open-mixtral":  "Mistral AI",
    "llama": "Meta AI",
    "meta-llama-3": "Meta AI",
    "hermes-2-theta-llama-3": "Meta AI",
    "phi": "Microsoft",
    "wizardlm": "Microsoft",
    "qwen": "Alibaba",
    "qwq": "Alibara",
    "deepseek": "DeepSeek",
    "command": "Cohere",
    "titan": "Amazon",
    "yi": "O1.AI",
    "dbrx": "Databricks",
    "eurus": "Prime RL"
}

# Minimal scorer mapping - only map specific cases
SCORER_MAPPING = {
    "verification_code": "pass@1 accuracy",
    "swe_bench_scorer": "pass@1 accuracy"
}


def generate_model_short_name(model_name):
    """Generate a short display name for a model."""
    # Special cases first
    if "deepseek-r1" in model_name.lower():
        return "DeepSeek-R1"
    elif "claude-opus-4" in model_name.lower():
        return "Claude Opus 4"
    elif "claude-sonnet-4" in model_name.lower():
        return "Claude Sonnet 4"
    elif "claude-3-7-sonnet" in model_name.lower():
        if "16K" in model_name:
            return "Claude 3.7 Sonnet (16k thinking)"
        else:
            return "Claude 3.7 Sonnet"
    elif "claude-3.5-sonnet" in model_name or "claude-3-5-sonnet" in model_name:
        return "Claude 3.5 Sonnet"
    elif "claude-3.5-haiku" in model_name or "claude-3-5-haiku" in model_name:
        return "Claude 3.5 Haiku"
    elif "gemini-2.5-pro" in model_name.lower():
        if "preview" in model_name.lower():
            return "Gemini 2.5 Pro Preview"
        return "Gemini 2.5 Pro"
    elif "gemini-2.0" in model_name.lower():
        if "flash" in model_name.lower():
            if "thinking" in model_name.lower():
                return "Gemini 2.0 Flash Thinking"
            return "Gemini 2.0 Flash"
        return "Gemini 2.0"
    elif "gemini-1.5" in model_name.lower():
        if "pro" in model_name.lower():
            return "Gemini 1.5 Pro"
        elif "flash" in model_name.lower():
            return "Gemini 1.5 Flash"
    elif "gpt-4.1" in model_name.lower():
        if "mini" in model_name.lower():
            return "GPT-4.1 Mini"
        return "GPT-4.1"
    elif "gpt-4o" in model_name.lower():
        if "mini" in model_name.lower():
            return "GPT-4o mini"
        return "GPT-4o"
    elif "gpt-4" in model_name.lower():
        if "turbo" in model_name.lower():
            return "GPT-4 Turbo"
        return "GPT-4"
    elif "gpt-3.5" in model_name.lower():
        return "GPT-3.5 Turbo"
    elif re.match(r"o[134]-", model_name.lower()):
        # Handle o1, o3, o4 models
        # Pattern: o[134](-mini)?(-date)?(_level)?
        model_lower = model_name.lower()
        
        # Extract the base model (o1, o3, o4)
        model_series = model_lower[:2].upper()
        
        # Check for -mini variant
        if "-mini" in model_lower:
            name = f"{model_series}-mini"
        else:
            name = model_series
        
        # Check for level suffix (_low, _medium, _high)
        if "_high" in model_lower:
            name += " (high)"
        elif "_medium" in model_lower:
            name += " (medium)"
        elif "_low" in model_lower:
            name += " (low)"
        
        return name
    elif "grok" in model_name.lower():
        if "grok-3" in model_name.lower():
            if "beta" in model_name.lower():
                if "mini" in model_name.lower():
                    return "Grok-3 mini (beta)"
                return "Grok-3 (beta)"
            return "Grok-3"
        elif "grok-2" in model_name.lower():
            return "Grok-2"
        return "Grok"
    elif "mistral" in model_name.lower():
        if "large" in model_name.lower():
            return "Mistral Large"
        elif "medium" in model_name.lower():
            return "Mistral Medium"
        elif "small" in model_name.lower():
            return "Mistral Small"
        return "Mistral"
    elif "llama" in model_name.lower():
        match = re.search(r"llama-?(\d+(?:\.\d+)?)", model_name.lower())
        if match:
            version = match.group(1)
            return f"Llama {version}"
        return "Llama"
    elif "phi" in model_name.lower():
        match = re.search(r"phi-(\d+(?:\.\d+)?)", model_name.lower())
        if match:
            version = match.group(1)
            return f"Phi-{version}"
        return "Phi"
    elif "qwen" in model_name.lower():
        if "qwen2.5" in model_name.lower() or "qwen-2.5" in model_name.lower():
            return "Qwen2.5"
        elif "qwen2" in model_name.lower():
            return "Qwen2"
        return "Qwen"
    
    # Default: clean up the model name
    # Remove date suffixes
    short_name = re.sub(r"-\d{4}-\d{2}-\d{2}", "", model_name)
    short_name = re.sub(r"-\d{8}", "", short_name)
    # Remove version suffixes like _low, _medium, _high
    short_name = re.sub(r"_(low|medium|high)$", "", short_name)
    
    return short_name


def extract_score_stderr_and_scorer(scores_str, best_score):
    """Extract score, stderr, and scorer name from the scores string."""
    if pd.isna(scores_str) or scores_str == "":
        return best_score, 0.0, "accuracy"
    
    # Parse the scores string - format is "scorer_name:score±stderr"
    try:
        # Split by comma if multiple scorers
        score_parts = scores_str.split(",")
        
        # Look for the best score match
        for part in score_parts:
            if ":" in part and "±" in part:
                scorer_name, score_stderr = part.split(":", 1)
                score_val, stderr_val = score_stderr.split("±")
                score_val = float(score_val)
                stderr_val = float(stderr_val)
                
                # Use the score that matches best_score if available
                if abs(score_val - best_score) < 0.001:
                    # Apply minimal mapping
                    scorer_display = SCORER_MAPPING.get(scorer_name.strip(), scorer_name.strip())
                    return score_val, stderr_val, scorer_display
        
        # If no exact match, return the first valid score
        if score_parts:
            first_part = score_parts[0]
            if ":" in first_part and "±" in first_part:
                scorer_name, score_stderr = first_part.split(":", 1)
                score_val, stderr_val = score_stderr.split("±")
                # Apply minimal mapping
                scorer_display = SCORER_MAPPING.get(scorer_name.strip(), scorer_name.strip())
                return float(score_val), float(stderr_val), scorer_display
                
    except Exception as e:
        print(f"Error parsing scores: {scores_str}, error: {e}")
    
    return best_score, 0.0, "accuracy"


def get_organization(model_name):
    """Extract organization from model name."""
    model_lower = model_name.lower()
    
    for prefix, org in MODEL_TO_ORG.items():
        prefix = prefix.lower()
        if model_lower.startswith(prefix):
            return org
    
    # Special cases
    if "palm" in model_lower:
        return "Google"
    elif "bard" in model_lower:
        return "Google"
    
    raise ValueError(f"Unknown: {model_name}")


def parse_release_date(date_str):
    """Parse various date formats into a consistent format."""
    if pd.isna(date_str) or date_str == "":
        return None
    
    # Try to extract date from model name if present
    date_patterns = [
        r"(\d{4}-\d{2}-\d{2})",  # YYYY-MM-DD
        r"(\d{8})",               # YYYYMMDD
        r"(\d{4})",               # Just year
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, str(date_str))
        if match:
            date_str = match.group(1)
            if len(date_str) == 8:  # YYYYMMDD
                return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            elif len(date_str) == 4:  # Just year
                return f"{date_str}-01-01"
            else:
                return date_str
    
    return None


def extract_model_date_from_name(model_name):
    """Extract date from model name if present."""
    # Common date patterns in model names
    patterns = [
        r"(\d{4}-\d{2}-\d{2})",  # YYYY-MM-DD
        r"(\d{8})",               # YYYYMMDD  
        r"-(\d{4})(?:$|-)",       # Year only
    ]
    
    for pattern in patterns:
        match = re.search(pattern, model_name)
        if match:
            date_str = match.group(1)
            if len(date_str) == 8:  # YYYYMMDD
                return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            elif len(date_str) == 4:  # Just year
                return f"{date_str}-01-01"
            else:
                return date_str
    
    return None


def main():
    """Main data preparation function."""
    
    # Load data files
    print("Loading data files...")
    runs_df = pd.read_csv(DATA_DIR / "benchmarks_runs.csv")
    scores_df = pd.read_csv(DATA_DIR / "benchmarks_scores.csv")
    model_versions_df = pd.read_csv(DATA_DIR / "model_versions.csv")
    organizations_df = pd.read_csv(DATA_DIR / "organizations.csv")
    
    # Filter for target benchmarks
    print("\nFiltering for target benchmarks...")
    target_runs = runs_df[runs_df['task'].isin(BENCHMARK_MAPPING.keys())].copy()
    print(f"Found {len(target_runs)} runs for target benchmarks")
    
    # Initialize result list
    results = []
    
    # Process each run
    print("\nProcessing benchmark runs...")
    for _, run in target_runs.iterrows():
        # Get basic info
        model = run['model']
        benchmark_display = BENCHMARK_MAPPING[run['task']]
        best_score = run['Best score (across scorers)']
        log_viewer = run['log viewer']
        
        # Extract score, stderr, and scorer
        score, stderr, scorer = extract_score_stderr_and_scorer(run['Scores'], best_score)
        
        # Generate short model name
        model_short_name = generate_model_short_name(model)
        
        # Get organization
        organization = get_organization(model)
        
        # Try to get release date from model_versions
        release_date = None
        
        # First try exact match
        model_match = model_versions_df[model_versions_df['id'] == model]
        if not model_match.empty:
            release_date = parse_release_date(model_match.iloc[0]['Version release date'])
        
        # If no exact match, try to extract from model name
        if release_date is None:
            release_date = extract_model_date_from_name(model)
        
        # Create result row
        results.append({
            'model': model,
            'model_short_name': model_short_name,
            'organization': organization,
            'release_date': release_date,
            'eval': benchmark_display,
            'score': score,
            'scorer': scorer,
            'stderr': stderr,
            'log_viewer': log_viewer
        })
    
    # Create final dataframe
    df = pd.DataFrame(results)

    # convert to proper date
    df['release_date'] = pd.to_datetime(df['release_date'])

    # filter orgs
    organizations = ["OpenAI", "Anthropic", "Google", "Meta AI", "xAI", "Mistral AI"]
    final_df = df[df['organization'].isin(organizations)]
    
    # Sort by benchmark and score
    final_df = final_df.sort_values(['eval', 'score'], ascending=[True, False])
    
    # Display summary
    print("\n=== Data Preparation Complete ===")
    print(f"\nTotal rows: {len(final_df)}")
    print(f"\nBenchmarks included:")
    for benchmark in final_df['eval'].unique():
        count = len(final_df[final_df['eval'] == benchmark])
        print(f"  - {benchmark}: {count} runs")
    
    print(f"\nOrganizations found:")
    for org in final_df['organization'].unique():
        count = len(final_df[final_df['organization'] == org])
        print(f"  - {org}: {count} runs")
    
    print(f"\nMissing data:")
    print(f"  - Release dates missing: {final_df['release_date'].isna().sum()}")
    
    # Save to parquet
    output_path = "evals.parquet"
    final_df.to_parquet(output_path, index=False)
    print(f"\nData saved to: {output_path}")
    
    # Display sample rows
    print("\n=== Sample Output ===")
    print("\nFirst 5 rows:")
    print(final_df.head().to_string())
    
    print("\n\nSample from each benchmark:")
    for benchmark in final_df['eval'].unique():
        print(f"\n{benchmark}:")
        sample = final_df[final_df['eval'] == benchmark].head(2)
        print(sample[['model_short_name', 'organization', 'release_date', 'scorer', 'score', 'stderr']].to_string())
    
    return final_df


if __name__ == "__main__":
    df = main()