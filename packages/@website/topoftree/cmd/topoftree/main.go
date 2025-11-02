package main

import (
	"fmt"
	"os"
	"path/filepath"
)

// findRepoRoot walks up the directory tree to find the git repository root
func findRepoRoot(startPath string) (string, error) {
	currentPath, err := filepath.Abs(startPath)
	if err != nil {
		return "", err
	}

	for {
		gitPath := filepath.Join(currentPath, ".git")
		if _, err := os.Stat(gitPath); err == nil {
			return currentPath, nil
		}

		parent := filepath.Dir(currentPath)
		if parent == currentPath {
			return "", fmt.Errorf("not in a git repository")
		}
		currentPath = parent
	}
}

func main() {
	cwd, err := os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error getting current directory: %v\n", err)
		os.Exit(1)
	}

	repoRoot, err := findRepoRoot(cwd)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error finding repository root: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(repoRoot)
}
