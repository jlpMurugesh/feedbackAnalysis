# feedbackAnalysis

REQUIRED:

Need the MS forms...It would be very helpful

INPUT/OUTPUT:

Input: Forms(???), Excel sheet
Output: FeedbackReport.pdf, A dashboard maybe(???)

How scores are calculated??? -> Scores are wrong in Jordan's

SCORE CALCULATION:

numerator = (no.of excellent)*(5) + (no.of very good)*(4) + (no.of good)*(3) + (no.of avg)*(2) + (no.of poor)*(1)
denom = (no.of trainees/total no.of responses)*5

overall rating out of 5 = (numerator/denom)*5

VARIABLES REQUIRED:

ReportTitle(eg: ILP - Angular Final Feedback Analysis)
batchName
totalTraineeCount
tainerName
Overall Program Rating - Out of 5

QuestionTitleColumns
RatingSplitsForEachQuestion
totalRespondedTrainees

CommentsByTrainees(May be AI can be used)

THINGS INTENDED/EXPECTED FROM CLIENT(JORDAN) AS A DEVELOPER:

ASK JORDAN TO DELETE THE 'NOT TRAINERM SPECIFIC QUESTIONS' FROM THE EXCEL

...

DESIGN:

Normal
For scores -> Adjustable table

Last part: A GenAI thing

Things to remember: It need not be a A4 sheet thing...

CHALLENGES IN THE PROJECT:

* Basically there are two types of forms
    1. Form for single trainer(Questions available)
    2. Form for multiple trainers(No questions in the excel sheet)
        -> For this form, how do I get the questions as a web app???

PROJECT TIMELINE:

1. User Authentication: Sat night: ✅

    *Two branches

2. Data Handling: Sat night:

    First: Trainee Centric,
    Then: Trainer Centric

    1. Multiple trainers:

        {
            trainers: ['Suneesh Thampi', 'Lekshmi', 'Hari'],
            1:{
                Suneesh Thampi:{
                    The trainer provided me adequate opportunity to ask questions/clarify the concepts:
                    Included an appropriate number of activities, exercise, and interaction during the session: 
                    The trainer is a subject matter expert and is approachable
                    The trainer encouraged participation and enthusiasm throughout the class
                },
                Lekshmi:{

                },
                Hari:{

                }

                Attention was paid to details like arrangements, i.e., the location, seating arrangements, projector, etc. : Excellent,
                
                text: {
                    What went well / things you most liked about the program: ,
                    What needs improvement / things you less liked about the program
                }
                
            },
            2:{

            },...
            no.of students/no.of rows in excel sheet :{

            }
        }

    2. Single trainer:

        {
            trainer: <To be filled by the client/Should be requested by the web app>,
            1: {
                The trainer provided me adequate opportunity to ask questions/clarify the concepts: ,
                Included an appropriate number of activities, exercise, and interaction during the session: ,
                The trainer is a subject matter expert and is approachable: ,
                The trainer encouraged participation and enthusiasm throughout the class: ,
                Attention was paid to details like arrangements, i.e., the location, seating arrangements, projector, etc.: , 

                text: {
                    What went well / things you most liked about the program: ,
                    What needs improvement / things you less liked about the program
                }
            },
            2:{

            },...
            no.of students/no.of rows :{

            }
        }

3. Feedback Report: Monday, Tuesday(Probably start by sunday)
4. UI/UX: Wednesday evening

