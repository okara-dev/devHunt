from datetime import datetime

WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag",
              "Freitag", "Samstag", "Sonntag"]

MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni",
          "Juli", "August", "September", "Oktober", "November", "Dezember"]


def get_time_date() -> str:
    now = datetime.now()
    wt = WOCHENTAGE[now.weekday()]
    monat = MONATE[now.month - 1]
    return (f"Es ist {now.strftime('%H:%M')} Uhr am {wt}, "
            f"den {now.day}. {monat} {now.year}.")