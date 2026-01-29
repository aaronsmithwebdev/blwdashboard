-- Seed event_group_discount from the price window JSON.
-- Replace __PASTE_JSON__ with the JSON block before running.
-- Expects event_category.display_name = city and event_group.year = year.

with payload as (
  select $${
  "price_type_names": {
    "BGP": "Bloody Great Price",
    "SEB": "Super Early Bird",
    "EB": "Early Bird",
    "REG": "Regular Price"
  },
  "2022": [
    {
      "city": "Melbourne",
      "source_dates": {
        "bgp_close": "2022-03-11",
        "seb_close": "2022-04-08",
        "eb_close": "2022-04-29",
        "entries_close": "2022-05-13"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-03-01",
          "end_date": "2022-03-11"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-03-12",
          "end_date": "2022-04-08"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-04-09",
          "end_date": "2022-04-29"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-04-30",
          "end_date": "2022-05-13"
        }
      ]
    },
    {
      "city": "Sunshine Coast",
      "source_dates": {
        "bgp_close": "2022-03-25",
        "seb_close": "2022-04-22",
        "eb_close": "2022-05-13",
        "entries_close": "2022-05-27"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-03-15",
          "end_date": "2022-03-25"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-03-26",
          "end_date": "2022-04-22"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-04-23",
          "end_date": "2022-05-13"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-05-14",
          "end_date": "2022-05-27"
        }
      ]
    },
    {
      "city": "Brisbane",
      "source_dates": {
        "bgp_close": "2022-04-08",
        "seb_close": "2022-05-06",
        "eb_close": "2022-05-27",
        "entries_close": "2022-06-10"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-03-29",
          "end_date": "2022-04-08"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-04-09",
          "end_date": "2022-05-06"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-05-07",
          "end_date": "2022-05-27"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-05-28",
          "end_date": "2022-06-10"
        }
      ]
    },
    {
      "city": "Wollongong",
      "source_dates": {
        "bgp_close": "2022-04-08",
        "seb_close": "2022-05-06",
        "eb_close": "2022-06-03",
        "entries_close": "2022-06-17"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-03-30",
          "end_date": "2022-04-08"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-04-09",
          "end_date": "2022-05-06"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-05-07",
          "end_date": "2022-06-03"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-06-04",
          "end_date": "2022-06-17"
        }
      ]
    },
    {
      "city": "Sydney North",
      "source_dates": {
        "bgp_close": "2022-05-13",
        "seb_close": "2022-06-10",
        "eb_close": "2022-07-08",
        "entries_close": "2022-07-22"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-05-03",
          "end_date": "2022-05-13"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-05-14",
          "end_date": "2022-06-10"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-06-11",
          "end_date": "2022-07-08"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-07-09",
          "end_date": "2022-07-22"
        }
      ]
    },
    {
      "city": "Newcastle",
      "source_dates": {
        "bgp_close": "2022-06-24",
        "seb_close": "2022-07-22",
        "eb_close": "2022-08-19",
        "entries_close": "2022-09-02"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-06-14",
          "end_date": "2022-06-24"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-06-25",
          "end_date": "2022-07-22"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-07-23",
          "end_date": "2022-08-19"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-08-20",
          "end_date": "2022-09-02"
        }
      ]
    },
    {
      "city": "Perth",
      "source_dates": {
        "bgp_close": "2022-07-15",
        "seb_close": "2022-08-05",
        "eb_close": "2022-09-02",
        "entries_close": "2022-09-09"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-07-05",
          "end_date": "2022-07-15"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-07-16",
          "end_date": "2022-08-05"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-08-06",
          "end_date": "2022-09-02"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-09-03",
          "end_date": "2022-09-09"
        }
      ]
    },
    {
      "city": "Mornington Peninsula",
      "source_dates": {
        "bgp_close": "2022-07-29",
        "seb_close": "2022-09-02",
        "eb_close": "2022-09-23",
        "entries_close": "2022-10-07"
      },
      "note": "Original sheet had 'Tuesday , July 19' for public launch; interpreted as 2022-07-19.",
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-07-19",
          "end_date": "2022-07-29"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-07-30",
          "end_date": "2022-09-02"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-09-03",
          "end_date": "2022-09-23"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-09-24",
          "end_date": "2022-10-07"
        }
      ]
    },
    {
      "city": "Adelaide",
      "source_dates": {
        "bgp_close": "2022-08-12",
        "seb_close": "2022-09-09",
        "eb_close": "2022-09-30",
        "entries_close": "2022-10-21"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-08-02",
          "end_date": "2022-08-12"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-08-13",
          "end_date": "2022-09-09"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-09-10",
          "end_date": "2022-09-30"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-10-01",
          "end_date": "2022-10-21"
        }
      ]
    },
    {
      "city": "Sydney East",
      "source_dates": {
        "bgp_close": "2022-09-02",
        "seb_close": "2022-09-23",
        "eb_close": "2022-10-21",
        "entries_close": "2022-11-04"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2022-08-16",
          "end_date": "2022-09-02"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2022-09-03",
          "end_date": "2022-09-23"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2022-09-24",
          "end_date": "2022-10-21"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2022-10-22",
          "end_date": "2022-11-04"
        }
      ]
    }
  ],
  "2023": [
    {
      "city": "Melbourne",
      "source_dates": {
        "bgp_close": "2023-03-17",
        "seb_close": "2023-04-14",
        "eb_close": "2023-05-05",
        "entries_close": "2023-05-12"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-02-28",
          "end_date": "2023-03-17"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-03-18",
          "end_date": "2023-04-14"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-04-15",
          "end_date": "2023-05-05"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-05-06",
          "end_date": "2023-05-12"
        }
      ]
    },
    {
      "city": "Sunshine Coast",
      "source_dates": {
        "bgp_close": "2023-03-24",
        "seb_close": "2023-04-21",
        "eb_close": "2023-05-12",
        "entries_close": "2023-05-26"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-03-14",
          "end_date": "2023-03-24"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-03-25",
          "end_date": "2023-04-21"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-04-22",
          "end_date": "2023-05-12"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-05-13",
          "end_date": "2023-05-26"
        }
      ]
    },
    {
      "city": "Brisbane",
      "source_dates": {
        "bgp_close": "2023-03-31",
        "seb_close": "2023-05-05",
        "eb_close": "2023-05-26",
        "entries_close": "2023-06-09"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-03-21",
          "end_date": "2023-03-31"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-04-01",
          "end_date": "2023-05-05"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-05-06",
          "end_date": "2023-05-26"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-05-27",
          "end_date": "2023-06-09"
        }
      ]
    },
    {
      "city": "Wollongong",
      "source_dates": {
        "bgp_close": "2023-04-06",
        "seb_close": "2023-05-12",
        "eb_close": "2023-06-02",
        "entries_close": "2023-06-16"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-03-21",
          "end_date": "2023-04-06"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-04-07",
          "end_date": "2023-05-12"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-05-13",
          "end_date": "2023-06-02"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-06-03",
          "end_date": "2023-06-16"
        }
      ]
    },
    {
      "city": "Sydney North",
      "source_dates": {
        "bgp_close": "2023-05-26",
        "seb_close": "2023-06-16",
        "eb_close": "2023-07-07",
        "entries_close": "2023-07-21"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-05-09",
          "end_date": "2023-05-26"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-05-27",
          "end_date": "2023-06-16"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-06-17",
          "end_date": "2023-07-07"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-07-08",
          "end_date": "2023-07-21"
        }
      ]
    },
    {
      "city": "Perth",
      "source_dates": {
        "bgp_close": "2023-06-02",
        "seb_close": "2023-06-30",
        "eb_close": "2023-07-21",
        "entries_close": "2023-08-04"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-05-23",
          "end_date": "2023-06-02"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-06-03",
          "end_date": "2023-06-30"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-07-01",
          "end_date": "2023-07-21"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-07-22",
          "end_date": "2023-08-04"
        }
      ]
    },
    {
      "city": "Newcastle",
      "source_dates": {
        "bgp_close": "2023-06-30",
        "seb_close": "2023-07-28",
        "eb_close": "2023-08-18",
        "entries_close": "2023-09-01"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-06-20",
          "end_date": "2023-06-30"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-07-01",
          "end_date": "2023-07-28"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-07-29",
          "end_date": "2023-08-18"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-08-19",
          "end_date": "2023-09-01"
        }
      ]
    },
    {
      "city": "Mornington Peninsula",
      "source_dates": {
        "bgp_close": "2023-08-04",
        "seb_close": "2023-09-08",
        "eb_close": "2023-09-29",
        "entries_close": "2023-10-06"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-07-25",
          "end_date": "2023-08-04"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-08-05",
          "end_date": "2023-09-08"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-09-09",
          "end_date": "2023-09-29"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-09-30",
          "end_date": "2023-10-06"
        }
      ]
    },
    {
      "city": "Adelaide",
      "source_dates": {
        "bgp_close": "2023-08-18",
        "seb_close": "2023-09-15",
        "eb_close": "2023-10-06",
        "entries_close": "2023-10-20"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-08-06",
          "end_date": "2023-08-18"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-08-19",
          "end_date": "2023-09-15"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-09-16",
          "end_date": "2023-10-06"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-10-07",
          "end_date": "2023-10-20"
        }
      ]
    },
    {
      "city": "Canberra",
      "source_dates": {
        "bgp_close": "2023-09-01",
        "seb_close": "2023-09-29",
        "eb_close": "2023-10-20",
        "entries_close": "2023-11-03"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-08-22",
          "end_date": "2023-09-01"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-09-02",
          "end_date": "2023-09-29"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-09-30",
          "end_date": "2023-10-20"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-10-21",
          "end_date": "2023-11-03"
        }
      ]
    },
    {
      "city": "Sydney East",
      "source_dates": {
        "bgp_close": "2023-09-22",
        "seb_close": "2023-10-13",
        "eb_close": "2023-11-03",
        "entries_close": "2023-11-10"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2023-09-05",
          "end_date": "2023-09-22"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2023-09-23",
          "end_date": "2023-10-13"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2023-10-14",
          "end_date": "2023-11-03"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2023-11-04",
          "end_date": "2023-11-10"
        }
      ]
    }
  ],
  "2024": [
    {
      "city": "Melbourne",
      "source_dates": {
        "bgp_close": "2024-03-15",
        "seb_close": "2024-04-12",
        "eb_close": "2024-05-03",
        "entries_close": "2024-05-17"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-02-27",
          "end_date": "2024-03-15"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-03-16",
          "end_date": "2024-04-12"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-04-13",
          "end_date": "2024-05-03"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-05-04",
          "end_date": "2024-05-17"
        }
      ]
    },
    {
      "city": "Sunshine Coast",
      "source_dates": {
        "bgp_close": "2024-03-22",
        "seb_close": "2024-04-19",
        "eb_close": "2024-05-17",
        "entries_close": "2024-05-31"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-03-12",
          "end_date": "2024-03-22"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-03-23",
          "end_date": "2024-04-19"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-04-20",
          "end_date": "2024-05-17"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-05-18",
          "end_date": "2024-05-31"
        }
      ]
    },
    {
      "city": "Brisbane",
      "source_dates": {
        "bgp_close": "2024-03-22",
        "seb_close": "2024-04-19",
        "eb_close": "2024-05-24",
        "entries_close": "2024-06-14"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-03-12",
          "end_date": "2024-03-22"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-03-23",
          "end_date": "2024-04-19"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-04-20",
          "end_date": "2024-05-24"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-05-25",
          "end_date": "2024-06-14"
        }
      ]
    },
    {
      "city": "Wollongong",
      "source_dates": {
        "bgp_close": "2024-04-12",
        "seb_close": "2024-05-03",
        "eb_close": "2024-05-31",
        "entries_close": "2024-06-21"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-03-26",
          "end_date": "2024-04-12"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-04-13",
          "end_date": "2024-05-03"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-05-04",
          "end_date": "2024-05-31"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-06-01",
          "end_date": "2024-06-21"
        }
      ]
    },
    {
      "city": "Sydney North",
      "source_dates": {
        "bgp_close": "2024-05-31",
        "seb_close": "2024-06-21",
        "eb_close": "2024-07-19",
        "entries_close": "2024-08-02"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-05-14",
          "end_date": "2024-05-31"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-06-01",
          "end_date": "2024-06-21"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-06-22",
          "end_date": "2024-07-19"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-07-20",
          "end_date": "2024-08-02"
        }
      ]
    },
    {
      "city": "Newcastle",
      "source_dates": {
        "bgp_close": "2024-06-21",
        "seb_close": "2024-07-19",
        "eb_close": "2024-08-09",
        "entries_close": "2024-08-23"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-06-04",
          "end_date": "2024-06-21"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-06-22",
          "end_date": "2024-07-19"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-07-20",
          "end_date": "2024-08-09"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-08-10",
          "end_date": "2024-08-23"
        }
      ]
    },
    {
      "city": "Perth",
      "source_dates": {
        "bgp_close": "2024-07-05",
        "seb_close": "2024-08-02",
        "eb_close": "2024-08-30",
        "entries_close": "2024-09-13"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-06-25",
          "end_date": "2024-07-05"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-07-06",
          "end_date": "2024-08-02"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-08-03",
          "end_date": "2024-08-30"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-08-31",
          "end_date": "2024-09-13"
        }
      ]
    },
    {
      "city": "Mornington Peninsula",
      "source_dates": {
        "bgp_close": "2024-08-02",
        "seb_close": "2024-08-30",
        "eb_close": "2024-09-27",
        "entries_close": "2024-10-11"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-07-23",
          "end_date": "2024-08-02"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-08-03",
          "end_date": "2024-08-30"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-08-31",
          "end_date": "2024-09-27"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-09-28",
          "end_date": "2024-10-11"
        }
      ]
    },
    {
      "city": "Adelaide",
      "source_dates": {
        "bgp_close": "2024-08-23",
        "seb_close": "2024-09-13",
        "eb_close": "2024-10-11",
        "entries_close": "2024-10-25"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-08-06",
          "end_date": "2024-08-23"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-08-24",
          "end_date": "2024-09-13"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-09-14",
          "end_date": "2024-10-11"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-10-12",
          "end_date": "2024-10-25"
        }
      ]
    },
    {
      "city": "Canberra",
      "source_dates": {
        "bgp_close": "2024-09-06",
        "seb_close": "2024-09-27",
        "eb_close": "2024-10-25",
        "entries_close": "2024-11-08"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-08-20",
          "end_date": "2024-09-06"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-09-07",
          "end_date": "2024-09-27"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-09-28",
          "end_date": "2024-10-25"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-10-26",
          "end_date": "2024-11-08"
        }
      ]
    },
    {
      "city": "Sydney East",
      "source_dates": {
        "bgp_close": "2024-09-13",
        "seb_close": "2024-10-04",
        "eb_close": "2024-11-03",
        "entries_close": "2024-11-10"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2024-08-27",
          "end_date": "2024-09-13"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2024-09-14",
          "end_date": "2024-10-04"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2024-10-05",
          "end_date": "2024-11-03"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2024-11-04",
          "end_date": "2024-11-10"
        }
      ]
    }
  ],
  "2025": [
    {
      "city": "Melbourne",
      "source_dates": {
        "bgp_close": "2025-03-14",
        "seb_close": "2025-04-04",
        "eb_close": "2025-05-02",
        "entries_close": "2025-05-16"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-02-25",
          "end_date": "2025-03-14"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-03-15",
          "end_date": "2025-04-04"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-04-05",
          "end_date": "2025-05-02"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-05-03",
          "end_date": "2025-05-16"
        }
      ]
    },
    {
      "city": "Sunshine Coast",
      "source_dates": {
        "bgp_close": "2025-03-28",
        "seb_close": "2025-04-17",
        "eb_close": "2025-05-16",
        "entries_close": "2025-05-30"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-03-18",
          "end_date": "2025-03-28"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-03-29",
          "end_date": "2025-04-17"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-04-18",
          "end_date": "2025-05-16"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-05-17",
          "end_date": "2025-05-30"
        }
      ]
    },
    {
      "city": "Brisbane",
      "source_dates": {
        "bgp_close": "2025-04-17",
        "seb_close": "2025-05-09",
        "eb_close": "2025-06-06",
        "entries_close": "2025-06-27"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-04-01",
          "end_date": "2025-04-17"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-04-18",
          "end_date": "2025-05-09"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-05-10",
          "end_date": "2025-06-06"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-06-07",
          "end_date": "2025-06-27"
        }
      ]
    },
    {
      "city": "Wollongong",
      "source_dates": {
        "bgp_close": "2025-04-17",
        "seb_close": "2025-05-09",
        "eb_close": "2025-06-06",
        "entries_close": "2025-06-27"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-04-01",
          "end_date": "2025-04-17"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-04-18",
          "end_date": "2025-05-09"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-05-10",
          "end_date": "2025-06-06"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-06-07",
          "end_date": "2025-06-27"
        }
      ]
    },
    {
      "city": "Sydney North",
      "source_dates": {
        "bgp_close": "2025-05-16",
        "seb_close": "2025-06-06",
        "eb_close": "2025-07-04",
        "entries_close": "2025-08-01"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-04-29",
          "end_date": "2025-05-16"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-05-17",
          "end_date": "2025-06-06"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-06-07",
          "end_date": "2025-07-04"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-07-05",
          "end_date": "2025-08-01"
        }
      ]
    },
    {
      "city": "Newcastle",
      "source_dates": {
        "bgp_close": "2025-06-20",
        "seb_close": "2025-07-18",
        "eb_close": "2025-08-08",
        "entries_close": "2025-08-22"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-06-03",
          "end_date": "2025-06-20"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-06-21",
          "end_date": "2025-07-18"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-07-19",
          "end_date": "2025-08-08"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-08-09",
          "end_date": "2025-08-22"
        }
      ]
    },
    {
      "city": "Perth",
      "source_dates": {
        "bgp_close": "2025-07-11",
        "seb_close": "2025-08-01",
        "eb_close": "2025-08-29",
        "entries_close": "2025-09-12"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-06-24",
          "end_date": "2025-07-11"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-07-12",
          "end_date": "2025-08-01"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-08-02",
          "end_date": "2025-08-29"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-08-30",
          "end_date": "2025-09-12"
        }
      ]
    },
    {
      "city": "Mornington Peninsula",
      "source_dates": {
        "bgp_close": "2025-08-15",
        "seb_close": "2025-09-05",
        "eb_close": "2025-10-03",
        "entries_close": "2025-10-17"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-07-29",
          "end_date": "2025-08-15"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-08-16",
          "end_date": "2025-09-05"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-09-06",
          "end_date": "2025-10-03"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-10-04",
          "end_date": "2025-10-17"
        }
      ]
    },
    {
      "city": "Adelaide",
      "source_dates": {
        "bgp_close": "2025-08-22",
        "seb_close": "2025-09-12",
        "eb_close": "2025-10-10",
        "entries_close": "2025-10-24"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-08-05",
          "end_date": "2025-08-22"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-08-23",
          "end_date": "2025-09-12"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-09-13",
          "end_date": "2025-10-10"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-10-11",
          "end_date": "2025-10-24"
        }
      ]
    },
    {
      "city": "Sydney East",
      "source_dates": {
        "bgp_close": "2025-09-12",
        "seb_close": "2025-10-03",
        "eb_close": "2025-10-31",
        "entries_close": "2025-11-14"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2025-08-26",
          "end_date": "2025-09-12"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2025-09-13",
          "end_date": "2025-10-03"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2025-10-04",
          "end_date": "2025-10-31"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2025-11-01",
          "end_date": "2025-11-14"
        }
      ]
    }
  ],
  "2026": [
    {
      "city": "Melbourne",
      "source_dates": {
        "bgp_close": "2026-03-06",
        "seb_close": "2026-04-10",
        "eb_close": "2026-05-01",
        "entries_close": "2026-05-15"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-02-24",
          "end_date": "2026-03-06"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-03-07",
          "end_date": "2026-04-10"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-04-11",
          "end_date": "2026-05-01"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-05-02",
          "end_date": "2026-05-15"
        }
      ]
    },
    {
      "city": "Sunshine Coast",
      "source_dates": {
        "bgp_close": "2026-03-20",
        "seb_close": "2026-04-17",
        "eb_close": "2026-05-15",
        "entries_close": "2026-05-29"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-03-10",
          "end_date": "2026-03-20"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-03-21",
          "end_date": "2026-04-17"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-04-18",
          "end_date": "2026-05-15"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-05-16",
          "end_date": "2026-05-29"
        }
      ]
    },
    {
      "city": "Brisbane",
      "source_dates": {
        "bgp_close": "2026-04-02",
        "seb_close": "2026-05-01",
        "eb_close": "2026-05-29",
        "entries_close": "2026-06-19"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-03-24",
          "end_date": "2026-04-02"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-04-03",
          "end_date": "2026-05-01"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-05-02",
          "end_date": "2026-05-29"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-05-30",
          "end_date": "2026-06-19"
        }
      ]
    },
    {
      "city": "Newcastle",
      "source_dates": {
        "bgp_close": "2026-06-12",
        "seb_close": "2026-07-10",
        "eb_close": "2026-08-07",
        "entries_close": "2026-08-21"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-06-02",
          "end_date": "2026-06-12"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-06-13",
          "end_date": "2026-07-10"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-07-11",
          "end_date": "2026-08-07"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-08-08",
          "end_date": "2026-08-21"
        }
      ]
    },
    {
      "city": "Perth",
      "source_dates": {
        "bgp_close": "2026-07-03",
        "seb_close": "2026-07-31",
        "eb_close": "2026-08-28",
        "entries_close": "2026-09-11"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-06-23",
          "end_date": "2026-07-03"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-07-04",
          "end_date": "2026-07-31"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-08-01",
          "end_date": "2026-08-28"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-08-29",
          "end_date": "2026-09-11"
        }
      ]
    },
    {
      "city": "Adelaide",
      "source_dates": {
        "bgp_close": "2026-08-07",
        "seb_close": "2026-09-04",
        "eb_close": "2026-10-02",
        "entries_close": "2026-10-16"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-07-28",
          "end_date": "2026-08-07"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-08-08",
          "end_date": "2026-09-04"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-09-05",
          "end_date": "2026-10-02"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-10-03",
          "end_date": "2026-10-16"
        }
      ]
    },
    {
      "city": "Mornington Peninsula",
      "source_dates": {
        "bgp_close": "2026-08-14",
        "seb_close": "2026-09-11",
        "eb_close": "2026-10-09",
        "entries_close": "2026-10-23"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-08-04",
          "end_date": "2026-08-14"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-08-15",
          "end_date": "2026-09-11"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-09-12",
          "end_date": "2026-10-09"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-10-10",
          "end_date": "2026-10-23"
        }
      ]
    },
    {
      "city": "Sydney East",
      "source_dates": {
        "bgp_close": "2026-09-04",
        "seb_close": "2026-10-02",
        "eb_close": "2026-10-30",
        "entries_close": "2026-11-13"
      },
      "price_windows": [
        {
          "price_name": "Bloody Great Price",
          "start_date": "2026-08-25",
          "end_date": "2026-09-04"
        },
        {
          "price_name": "Super Early Bird",
          "start_date": "2026-09-05",
          "end_date": "2026-10-02"
        },
        {
          "price_name": "Early Bird",
          "start_date": "2026-10-03",
          "end_date": "2026-10-30"
        },
        {
          "price_name": "Regular Price",
          "start_date": "2026-10-31",
          "end_date": "2026-11-13"
        }
      ]
    }
  ]
}
$$::jsonb as data
),
years as (
  select key::int as year, value as entries
  from payload, jsonb_each(data)
  where key ~ '^[0-9]{4}$'
),
entries as (
  select year, jsonb_array_elements(entries) as entry
  from years
),
windows as (
  select
    year,
    entry->>'city' as city,
    jsonb_array_elements(entry->'price_windows') as price_window
  from entries
)
insert into public.event_group_discount (
  event_group_id,
  label,
  discount_amount,
  starts_at,
  ends_at,
  notes
)
select
  eg.id,
  w.price_window->>'price_name' as label,
  null::numeric as discount_amount,
  (w.price_window->>'start_date')::date as starts_at,
  (w.price_window->>'end_date')::date as ends_at,
  null::text as notes
from windows w
join public.event_category ec
  on lower(regexp_replace(ec.display_name, '[^a-z0-9]+', '', 'g'))
   = lower(regexp_replace(w.city, '[^a-z0-9]+', '', 'g'))
join public.event_group eg
  on eg.event_category_id = ec.id
 and eg.year = w.year
where not exists (
  select 1
  from public.event_group_discount d
  where d.event_group_id = eg.id
    and d.label = w.price_window->>'price_name'
    and d.starts_at = (w.price_window->>'start_date')::date
    and d.ends_at = (w.price_window->>'end_date')::date
);
