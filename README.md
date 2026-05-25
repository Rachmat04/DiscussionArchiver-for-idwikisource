# DiscussionArchiver.js — Wikisource Discussion Archiver

## Overview

**DiscussionArchiver.js** is a MediaWiki gadget designed for Wikisource that helps sysops archive discussion threads automatically based on inactivity. It targets the Wikisource namespace and identifies discussions whose most recent comment is at least two months old.

## Features

* Detects discussion threads in Wikisource pages
* Checks the timestamp of the last comment in each thread
* Flags threads with inactivity of ≥ 2 months
* Supports automated or assisted archiving workflows
* Designed for maintenance of discussion pages in structured archives

## Scope

* Works only in the Wikisource namespace (`Wikisumber:`)
* Focused on discussion pages containing structured talk threads

## Limitations

* Requires sysop (administrator) rights
* Only evaluates inactivity based on the last comment timestamp
* Does not support non-Wikisource namespaces
* Does not perform cross-wiki operations

## Permissions

* Restricted to sysop users only
* Archiving actions depend on elevated rights for page editing

## Requirements

* JavaScript-enabled MediaWiki gadget environment
* Administrative permissions on Wikisource
* Access to page revision timestamps

## How It Works

1. Scans Wikisource discussion pages
2. Identifies threads and extracts last comment timestamps
3. Compares timestamps with current date
4. Flags threads with ≥ 2 months of inactivity
5. Prepares them for archiving (manual or automated depending on configuration)

## Notes

* Intended for structured maintenance of inactive discussions
* Designed specifically for Wikisource workflows
* Helps reduce clutter in active discussion spaces
