"""Backward compatible entry point for the Google Calendar data source.

The agent action modules historically imported `app.sources.external.google.calendar.gcalendar`
even though the generated client now lives in `calendar.py`. Re-exporting the class from
this shim keeps existing tools working without duplicating the implementation.
"""

from .calendar import GoogleCalendarDataSource

__all__ = ["GoogleCalendarDataSource"]
