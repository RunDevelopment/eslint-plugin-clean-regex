import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/foo\.bar12/),
		String(/foo\.bar12/u),
		String(/\( \) \[ \] \{ \} \* \+ \? \/ \\ \| \^ \$/),
		String(/\( \) \[ \] \{ \} \* \+ \? \/ \\ \| \^ \$/u),

		String(/[\^ab]/),
		String(/[\^ab]/u),
		String(/[ab\-c]/),
		String(/[ab\-c]/u),
		String(/[a\--b]/),
		String(/[a\--b]/u),

		{
			code: String(/]{} \} [\/{}]/),
			options: [{
				rules: [
					{
						escape: "allow",
						characters: "[^]"
					}
				]
			}]
		}
	],
	invalid: [
		// test default rules

		{
			code: String(/\a \b \c \d \e \f \g \h \i \j \k \l \m \n \o \p \q \r \s \t \u \v \w \x \y \z \A \B \C \D \E \F \G \H \I \J \K \L \M \N \O \P \Q \R \S \T \U \V \W \X \Y \Z/),
			output: String(/a \b \c \d e \f g h i j k l m \n o p q \r \s \t u \v \w x y z A \B C \D E F G H I J K L M N O P Q R \S T U V \W X Y Z/),
			errors: 38
		},
		{
			code: String(/[\a \b \c \d \e \f \g \h \i \j \k \l \m \n \o \p \q \r \s \t \u \v \w \x \y \z \A \B \C \D \E \F \G \H \I \J \K \L \M \N \O \P \Q \R \S \T \U \V \W \X \Y \Z]/),
			output: String(/[a \b \c \d e \f g h i j k l m \n o p q \r \s \t u \v \w x y z A B C \D E F G H I J K L M N O P Q R \S T U V \W X Y Z]/),
			errors: 39
		},

		{
			code: String(/[\\ \( \) \{ \} \* \+ \? \/ \| \^ \$]/),
			output: String(/[\\ ( ) { } * + ? / | ^ $]/),
			errors: 11
		},
		{
			code: String(/[\\ \( \) \{ \} \* \+ \? \/ \| \^ \$]/u),
			output: String(/[\\ ( ) { } * + ? / | ^ $]/u),
			errors: 11
		},
		{
			code: String(/[\-abc\-]/),
			output: String(/[-abc-]/),
			errors: 2
		},
		{
			code: String(/[\-abc\-]/u),
			output: String(/[-abc-]/u),
			errors: 2
		},

		{
			code: String(/{ } ] [ [ \] ]/),
			output: String(/\{ \} \] [ \[ \] ]/),
			errors: 4
		},
	]
});
